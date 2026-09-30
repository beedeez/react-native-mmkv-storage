#include <jni.h>
#include <jsi/jsi.h>
#include <ReactCommon/CallInvokerHolder.h>
#include <fbjni/fbjni.h>
#include "MMKV.h"
#include "MMKVPredef.h"
#include "MMBuffer.h"
#include <android/log.h>
#include <algorithm>
#include <chrono>
#include <deque>
#include <mutex>

using namespace facebook;
using namespace jsi;
using namespace std;

static vector<MMKV *> mmkvInstances;

static string rPath = "";
static JavaVM *vm;
static jclass mmkvclass;
static jobject mmkvobject;

static string jstring2string(JNIEnv *env, jstring str)
{
    string result;
    if (!str)
        return result;

    const char *kstr = env->GetStringUTFChars(str, nullptr);
    if (kstr)
    {
        string result(kstr);
        env->ReleaseStringUTFChars(str, kstr);
        return result;
    }
    return result;
}

static std::string j_string_to_string(JNIEnv *env, jstring jStr)
{
    if (!jStr)
        return {};

    const auto stringClass = env->GetObjectClass(jStr);
    const auto getBytes = env->GetMethodID(stringClass, "getBytes", "(Ljava/lang/String;)[B");
    const auto stringJbytes = (jbyteArray)env->CallObjectMethod(jStr, getBytes,
                                                                env->NewStringUTF("UTF-8"));

    jsize length = (size_t)env->GetArrayLength(stringJbytes);
    jbyte *pBytes = env->GetByteArrayElements(stringJbytes, nullptr);

    std::string ret = std::string(reinterpret_cast<char *>(pBytes), length);
    env->ReleaseByteArrayElements(stringJbytes, pBytes, JNI_ABORT);

    env->DeleteLocalRef(stringJbytes);
    env->DeleteLocalRef(stringClass);
    return ret;
}

static jstring string2jstring(JNIEnv *env, const string &str)
{
    return (*env).NewStringUTF(str.c_str());
}

static jobjectArray vector2jarray(JNIEnv *env, const vector<string> &arr)
{
    if (!arr.empty())
    {
        jobjectArray result = env->NewObjectArray(arr.size(), env->FindClass("java/lang/String"),
                                                  nullptr);
        if (result)
        {
            for (size_t index = 0; index < arr.size(); index++)
            {
                jstring value = string2jstring(env, arr[index]);
                env->SetObjectArrayElement(result, index, value);
                env->DeleteLocalRef(value);
            }
        }
        return result;
    }
    return nullptr;
}

static vector<string> jarray2vector(JNIEnv *env, jobjectArray array)
{
    vector<string> keys;
    if (!array)
        return keys;

    jsize size = env->GetArrayLength(array);
    keys.reserve(size);
    for (jsize i = 0; i < size; i++)
    {
        jstring str = (jstring)env->GetObjectArrayElement(array, i);
        if (str)
        {
            keys.push_back(jstring2string(env, str));
            env->DeleteLocalRef(str);
        }
    }
    return keys;
}

struct MMKVErrorEntry
{
    string type;
    string mmapId;
    string message;
    double timestamp;
};

// Written from any MMKV operating thread, drained from the JS thread.
// Leaked on purpose: MMKV handlers can still fire during static destruction.
static std::mutex &errorBufferMutex = *new std::mutex();
static std::deque<MMKVErrorEntry> &errorBuffer = *new std::deque<MMKVErrorEntry>();
static constexpr size_t kMaxErrorEntries = 50;

static void pushMMKVError(const char *type, const string &mmapId, const string &message)
{
    try
    {
        auto now = std::chrono::duration_cast<std::chrono::milliseconds>(
                       std::chrono::system_clock::now().time_since_epoch())
                       .count();
        std::lock_guard<std::mutex> lock(errorBufferMutex);
        if (errorBuffer.size() >= kMaxErrorEntries)
        {
            errorBuffer.pop_front();
        }
        errorBuffer.push_back({type, mmapId, message, (double)now});
    }
    catch (...)
    {
        // Reporting must never break the storage core that called us.
    }
}

// OnErrorDiscard is what the core returns when no handler is registered (MMKV.cpp), so
// registering this handler only records the event and keeps the recovery behaviour unchanged.
static MMKVRecoverStrategic onMMKVError(const std::string &mmapID, MMKVErrorType errorType)
{
    pushMMKVError(errorType == MMKVCRCCheckFail ? "crcCheckFail" : "fileLengthError", mmapID, "");
    return OnErrorDiscard;
}

static android_LogPriority mmkvLogPriority(MMKVLogLevel level)
{
    switch (level)
    {
    case MMKVLogDebug:
        return ANDROID_LOG_DEBUG;
    case MMKVLogInfo:
        return ANDROID_LOG_INFO;
    case MMKVLogWarning:
        return ANDROID_LOG_WARN;
    case MMKVLogError:
        return ANDROID_LOG_ERROR;
    default:
        return ANDROID_LOG_UNKNOWN;
    }
}

// A registered log handler replaces the core's logcat output, so it is reproduced verbatim
// (MMKVLog_Android.cpp) before error-level lines are buffered.
static void onMMKVLog(MMKVLogLevel level, const char *file, int line, const char *function, const std::string &message)
{
    const char *safeFile = file ? file : "";
    const char *safeFunction = function ? function : "";
    __android_log_print(mmkvLogPriority(level), "MMKV", "<%s:%d::%s> %s", safeFile, line, safeFunction, message.c_str());
    if (level == MMKVLogError)
    {
        pushMMKVError("errorLog", "", string(safeFile) + ":" + to_string(line) + "::" + safeFunction + " " + message);
    }
}

// MMKV::initializeMMKV resets the log handler, so every init path goes through here.
// registerErrorHandler must run after initializeMMKV: it locks g_instanceLock, created by the first init.
static void initializeMMKVWithHandlers(const string &rootDir, MMKVLogLevel logLevel = MMKVLogInfo)
{
    MMKV::initializeMMKV(rootDir, logLevel, onMMKVLog);
    MMKV::registerErrorHandler(onMMKVError);
}

static MMKV *getInstance(const string &ID)
{
    auto kv = std::find_if(mmkvInstances.begin(), mmkvInstances.end(), [&ID](MMKV *inst)
                           { return inst->mmapID() == ID; });

    if (kv == mmkvInstances.end())
    {
        return nullptr;
    }
    return *kv;
}

static MMKV *createInstance(const string &ID, MMKVMode mode, string key, string path)
{
    auto it = find_if(mmkvInstances.begin(), mmkvInstances.end(), [&ID](MMKV *inst)
                      { return inst->mmapID() == ID; });
    if (it != mmkvInstances.end())
        mmkvInstances.erase(it);

    MMKV *kv = MMKV::mmkvWithID(ID, mmkv::DEFAULT_MMAP_SIZE, mode,
                                key.empty() ? nullptr : &key,
                                path.empty() ? nullptr : &path);

    mmkvInstances.push_back(kv);
    return kv;
}

// Function to sort a vector
void sortVector(std::vector<std::string> &vec)
{
    std::sort(vec.begin(), vec.end());
}

// Function to add a value to the vector while maintaining sorting order
void addValue(std::vector<std::string> &vec, std::string value)
{
    auto insertPosition = std::lower_bound(vec.begin(), vec.end(), value);
    vec.insert(insertPosition, value);
}

// Function to remove a value from the vector
void removeValue(std::vector<std::string> &vec, std::string value)
{
    auto position = std::lower_bound(vec.begin(), vec.end(), value);
    if (position != vec.end() && *position == value)
    {
        vec.erase(position);
    }
}

// Function to search for a value in the vector
bool hasValue(const std::vector<std::string> &vec, std::string value)
{
    return std::binary_search(vec.begin(), vec.end(), value);
}

std::unordered_map<std::string, bool> indexing_enabled = {};
std::unordered_map<std::string, std::unordered_map<std::string, std::vector<std::string>>> index_cache = {};

static vector<string> getIndex(MMKV *kv, const string &type)
{
    if (!indexing_enabled[kv->mmapID()])
        return {};

    auto kvIndex = index_cache[kv->mmapID()];

    if (kvIndex.count(type) == 0)
    {
        auto exists = kv->getVector(type, kvIndex[type]);
        if (!exists)
        {
            kvIndex[type] = std::vector<std::string>();
        }
        else
        {
            sortVector(kvIndex[type]);
        }
    }

    return kvIndex[type];
}

static const string dataTypes[] = {
    "stringIndex",
    "numberIndex",
    "boolIndex",
    "mapIndex",
    "arrayIndex",
};

static void removeFromIndex(MMKV *kv, const string &key)
{
    if (!indexing_enabled[kv->mmapID()])
        return;
    for (const auto &idx : dataTypes)
    {
        auto index = getIndex(kv, idx);
        if (hasValue(index, key))
        {
            removeValue(index, key);
            kv->set(index, idx);
            return;
        }
    }
}

static void removeKeysFromIndex(MMKV *kv, const vector<string> &arrKeys)
{
    if (!indexing_enabled[kv->mmapID()])
        return;

    auto strings = false;
    auto objects = false;
    auto arrays = false;
    auto numbers = false;
    auto booleans = false;

    for (const auto &key : arrKeys) {
        auto removed = false;
        for (const auto &idx : dataTypes)
        {
            if (removed) continue;

            auto index = getIndex(kv, idx);
            if (hasValue(index, key))
            {
                removeValue(index, key);

                if (idx == "stringIndex") strings = true;
                if (idx == "numberIndex") numbers = true;
                if (idx == "boolIndex") booleans = true;
                if (idx == "mapIndex") objects = true;
                if (idx == "arrayIndex") arrays = true;
                removed = true;
            }
        }
    }

    if (strings) kv->set(getIndex(kv, "stringIndex"), "stringIndex");
    if (objects) kv->set(getIndex(kv, "mapIndex"), "mapIndex");
    if (arrays) kv->set(getIndex(kv, "arrayIndex"), "arrayIndex");
    if (numbers) kv->set(getIndex(kv, "numberIndex"), "numberIndex");
    if (booleans) kv->set(getIndex(kv, "boolIndex"), "boolIndex");

}

static void setIndex(MMKV *kv, const string &type, const string &key)
{
    if (!indexing_enabled[kv->mmapID()])
        return;
    auto index = getIndex(kv, type);
    if (!hasValue(index, key))
    {
        addValue(index, key);
        kv->set(index, type);
    }
}

static void setIndexes(MMKV *kv, const string &type, const std::vector<std::string> keys[])
{
    if (!indexing_enabled[kv->mmapID()])
        return;
    auto index = getIndex(kv, type);
    int size = keys->size();
    for (int i = 0; i < size; i++)
    {
        addValue(index, keys->at(i));
    }
    kv->set(index, type);
}

template <typename NativeFunc>
static void createFunc(Runtime &jsiRuntime, const char *prop, int paramCount, NativeFunc &&func)
{
    auto f = Function::createFromHostFunction(jsiRuntime,
                                              PropNameID::forAscii(jsiRuntime, prop),
                                              paramCount,
                                              std::forward<NativeFunc>(func));
    jsiRuntime.global().setProperty(jsiRuntime, prop, std::move(f));
}

#define CREATE_FUNCTION(prop, paramCount, block) \
    createFunc(jsiRuntime, prop, paramCount, [](Runtime &runtime, const Value &thisValue, const Value *arguments, size_t count) -> Value { block })

#define CREATE_FUNCTION_CAPTURE(prop, paramCount, block) \
    createFunc(jsiRuntime, prop, paramCount, [=](Runtime &runtime, const Value &thisValue, const Value *arguments, size_t count) -> Value { block })

#define std_string(arg) \
    arg.getString(runtime).utf8(runtime)

#define CALLBACK(returnValue) \
    invoker->invokeAsync([&runtime, cbref] { cbref->call(runtime, returnValue); });

#define HOSTFN(name, basecount)           \
jsi::Function::createFromHostFunction( \
runtime, \
jsi::PropNameID::forAscii(runtime, name), \
basecount, \
[=](jsi::Runtime &runtime, const jsi::Value &thisValue, const jsi::Value *args, size_t count) -> jsi::Value

void initIndexForId(std::string id)
{
    index_cache[id] = unordered_map<std::string, std::vector<std::string>>();
}

void installBindings(Runtime &jsiRuntime)
{

    CREATE_FUNCTION("initializeMMKV", 0, {
        initializeMMKVWithHandlers(rPath);
        return Value::undefined();
    });

    createFunc(jsiRuntime, "drainMMKVErrors", 0, [](Runtime &runtime, const Value &thisValue, const Value *arguments, size_t count) -> Value {
        std::deque<MMKVErrorEntry> drained;
        {
            std::lock_guard<std::mutex> lock(errorBufferMutex);
            drained.swap(errorBuffer);
        }
        auto result = jsi::Array(runtime, drained.size());
        for (size_t i = 0; i < drained.size(); i++)
        {
            const auto &entry = drained[i];
            jsi::Object item(runtime);
            item.setProperty(runtime, "type", jsi::String::createFromUtf8(runtime, entry.type));
            item.setProperty(runtime, "mmapId", jsi::String::createFromUtf8(runtime, entry.mmapId));
            item.setProperty(runtime, "timestamp", jsi::Value(entry.timestamp));
            if (!entry.message.empty())
            {
                item.setProperty(runtime, "message", jsi::String::createFromUtf8(runtime, entry.message));
            }
            result.setValueAtIndex(runtime, i, std::move(item));
        }
        return result;
    });

    CREATE_FUNCTION("setupMMKVInstance", 5, {
        string id = std_string(arguments[0]);
        auto mode = (MMKVMode)(int)arguments[1].getNumber();
        string cryptKey = std_string(arguments[2]);
        MMKVPath_t path = std_string(arguments[3]);
        createInstance(id, mode, cryptKey, path);

        indexing_enabled[id] = arguments[4].getBool();
        initIndexForId(id);

        return Value(true);
    });

    CREATE_FUNCTION("getSecureKey", 1, {
        string alias = std_string(arguments[0]);

        JNIEnv *env;
        bool attached = vm->AttachCurrentThread(&env, NULL);
        mmkvclass = env->GetObjectClass(mmkvobject);

        jstring jstr1 = string2jstring(env, alias);
        jvalue params[1];
        params[0].l = jstr1;
        jmethodID getSecureKey = env->GetMethodID(mmkvclass, "getSecureKey",
                                                  "(Ljava/lang/String;)Ljava/lang/String;");
        jobject result = env->CallObjectMethodA(mmkvobject, getSecureKey, params);
        const char *str = env->GetStringUTFChars((jstring)result, NULL);
        string cryptKey = j_string_to_string(env, env->NewStringUTF(str));
        if (attached)
        {
            vm->DetachCurrentThread();
        }
        return Value(runtime, String::createFromUtf8(runtime, cryptKey));
    });

    CREATE_FUNCTION("setSecureKey", 2, {
        string alias = std_string(arguments[0]);
        string key = std_string(arguments[1]);

        JNIEnv *env;
        bool attached = vm->AttachCurrentThread(&env, NULL);
        mmkvclass = env->GetObjectClass(mmkvobject);

        jstring jstr1 = string2jstring(env, alias);
        jstring jstr2 = string2jstring(env, key);

        jvalue params[2];
        params[0].l = jstr1;
        params[1].l = jstr2;

        jmethodID setSecureKey = env->GetMethodID(mmkvclass, "setSecureKey",
                                                  "(Ljava/lang/String;Ljava/lang/String;)V");
        env->CallVoidMethodA(mmkvobject, setSecureKey, params);
        if (attached)
        {
            vm->DetachCurrentThread();
        }

        return Value(true);
    });

    CREATE_FUNCTION("secureKeyExists", 1, {
        string alias = std_string(arguments[0]);

        JNIEnv *env;
        bool attached = vm->AttachCurrentThread(&env, NULL);
        mmkvclass = env->GetObjectClass(mmkvobject);

        jstring jstr1 = string2jstring(env, alias);
        jvalue params[1];
        params[0].l = jstr1;

        jmethodID secureKeyExists = env->GetMethodID(mmkvclass, "secureKeyExists",
                                                     "(Ljava/lang/String;)Z");
        bool exists = env->CallBooleanMethodA(mmkvobject, secureKeyExists, params);
        if (attached)
        {
            vm->DetachCurrentThread();
        }
        return Value(exists);
    });

    CREATE_FUNCTION("removeSecureKey", 1, {
        string alias = std_string(arguments[0]);

        JNIEnv *env;
        bool attached = vm->AttachCurrentThread(&env, NULL);
        mmkvclass = env->GetObjectClass(mmkvobject);

        jstring jstr1 = string2jstring(env, alias);
        jvalue params[1];
        params[0].l = jstr1;

        jmethodID removeSecureKey = env->GetMethodID(mmkvclass, "removeSecureKey",
                                                     "(Ljava/lang/String;)V");
        env->CallVoidMethodA(mmkvobject, removeSecureKey, params);
        if (attached)
        {
            vm->DetachCurrentThread();
        }
        return Value(true);
    });

    CREATE_FUNCTION("setStringMMKV", 3, {
        MMKV *kv = getInstance(std_string(arguments[2]));
        if (!kv)
        {
            return Value::undefined();
        }

        string key = std_string(arguments[0]);
        setIndex(kv, "stringIndex", key);
        bool written = kv->set(std_string(arguments[1]), key);
        return Value(written);
    });

    CREATE_FUNCTION("setMultiMMKV", 4, {
        auto keys = arguments[0].getObject(runtime).asArray(runtime);
        auto values = arguments[1].getObject(runtime).asArray(runtime);
        auto dataType = std_string(arguments[2]);
        auto kvName = std_string(arguments[3]);
        auto kv = getInstance(kvName);
        auto size = keys.length(runtime);

        std::vector<std::string> keysArray = {};
        std::vector<std::string> keysToRemove = {};

        for (int i = 0; i < size; i++)
        {
            auto key = std_string(keys.getValueAtIndex(runtime, i));
            keysArray.push_back(key);
            if (values.getValueAtIndex(runtime, i).isString())
            {
                auto value = std_string(values.getValueAtIndex(runtime, i));
                kv->set(value, key);
            }
            else
            {
                if (kv->containsKey(key))
                {
                    keysToRemove.push_back(key);
                }
            }
        }
        kv->removeValuesForKeys(keysToRemove);
        removeKeysFromIndex(kv, keysToRemove);
        setIndexes(kv, dataType, &keysArray);
        return jsi::Value(true);
    });

    CREATE_FUNCTION("getStringMMKV", 2, {
        MMKV *kv = getInstance(std_string(arguments[1]));
        if (!kv)
        {
            return Value::undefined();
        }

        string result;
        bool exists = kv->getString(std_string(arguments[0]), result);
        if (!exists)
        {
            return Value::null();
        }
        return Value(runtime, String::createFromUtf8(runtime, result));
    });

    CREATE_FUNCTION("getMultiMMKV", 2, {
        auto keys = arguments[0].getObject(runtime).asArray(runtime);
        auto kvName = std_string(arguments[1]);
        auto kv = getInstance(kvName);
        auto size = keys.length(runtime);

        jsi::Array values = jsi::Array(runtime, size);

        for (int i = 0; i < size; i++)
        {
            auto key = std_string(keys.getValueAtIndex(runtime, i));
            std::string result;
            bool exists = kv->getString(key, result);
            if (exists)
            {
                values.setValueAtIndex(runtime, i, String::createFromUtf8(runtime, result));
            }
            else
            {
                values.setValueAtIndex(runtime, i, jsi::Value::null());
            }
        }

        return values;
    });

    CREATE_FUNCTION("getStringsMMKV", 2, {
        auto keys = arguments[0].getObject(runtime).asArray(runtime);
        auto kvName = std_string(arguments[1]);
        auto kv = getInstance(kvName);
        auto size = keys.length(runtime);

        if (!kv)
        {
            return Value::undefined();
        }

        jsi::Array values = jsi::Array(runtime, size);

        for (int i = 0; i < size; i++)
        {
            auto key = std_string(keys.getValueAtIndex(runtime, i));
            std::string result;
            bool exists = kv->getString(key, result);
            if (exists)
            {
                values.setValueAtIndex(runtime, i, String::createFromUtf8(runtime, result));
            }
            else
            {
                values.setValueAtIndex(runtime, i, jsi::Value::null());
            }
        }

        return values;
    });

    CREATE_FUNCTION("setStringsMMKV", 3, {
        auto keys = arguments[0].getObject(runtime).asArray(runtime);
        auto values = arguments[1].getObject(runtime).asArray(runtime);
        auto kvName = std_string(arguments[2]);
        auto kv = getInstance(kvName);
        auto size = keys.length(runtime);

        if (!kv)
        {
            return Value::undefined();
        }

        bool allWritten = true;
        for (int i = 0; i < size; i++)
        {
            auto key = std_string(keys.getValueAtIndex(runtime, i));
            const auto &val = values.getValueAtIndex(runtime, i);
            if (val.isString())
            {
                bool written = kv->set(val.getString(runtime).utf8(runtime), key);
                allWritten = allWritten && written;
            }
        }

        return jsi::Value(allWritten);
    });

    CREATE_FUNCTION("setMapMMKV", 3, {
        MMKV *kv = getInstance(std_string(arguments[2]));
        if (!kv)
        {
            return Value::undefined();
        }

        string key = std_string(arguments[0]);

        setIndex(kv, "mapIndex", key);
        kv->set(std_string(arguments[1]), key);
        return Value(true);
    });

    CREATE_FUNCTION("getMapMMKV", 2, {
        MMKV *kv = getInstance(std_string(arguments[1]));
        if (!kv)
        {
            return Value::undefined();
        }

        string result;
        bool exists = kv->getString(std_string(arguments[0]), result);
        if (!exists)
        {
            return Value::null();
        }
        return Value(runtime, String::createFromUtf8(runtime, result));
    });

    CREATE_FUNCTION("setArrayMMKV", 3, {
        MMKV *kv = getInstance(std_string(arguments[2]));
        if (!kv)
        {
            return Value::undefined();
        }

        string key = std_string(arguments[0]);

        setIndex(kv, "arrayIndex", key);
        kv->set(std_string(arguments[1]), key);
        return Value(true);
    });

    CREATE_FUNCTION("getArrayMMKV", 2, {
        MMKV *kv = getInstance(std_string(arguments[1]));

        if (!kv)
        {
            return Value::undefined();
        }

        string result;
        bool exists = kv->getString(std_string(arguments[0]), result);
        if (!exists)
        {
            return Value::null();
        }
        return Value(runtime, String::createFromUtf8(runtime, result));
    });

    CREATE_FUNCTION("setNumberMMKV", 3, {
        MMKV *kv = getInstance(std_string(arguments[2]));
        if (!kv)
        {
            return Value::undefined();
        }
        string key = std_string(arguments[0]);
        setIndex(kv, "numberIndex", key);
        kv->set(arguments[1].getNumber(), key);
        return Value(true);
    });

    CREATE_FUNCTION("getNumberMMKV", 2, {
        MMKV *kv = getInstance(std_string(arguments[1]));
        if (!kv)
        {
            return Value::undefined();
        }
        string key = std_string(arguments[0]);
        string result;
        bool exists = kv->containsKey(key);
        if (!exists)
        {
            return Value::null();
        }
        return Value(kv->getDouble(key));
    });

    CREATE_FUNCTION("setBoolMMKV", 3, {
        MMKV *kv = getInstance(std_string(arguments[2]));
        if (!kv)
        {
            return Value::undefined();
        }
        string key = std_string(arguments[0]);
        setIndex(kv, "boolIndex", key);
        kv->set(arguments[1].getBool(), key);
        return Value(true);
    });

    CREATE_FUNCTION("getBoolMMKV", 2, {
        MMKV *kv = getInstance(std_string(arguments[1]));
        if (!kv)
        {
            return Value::undefined();
        }

        string key = std_string(arguments[0]);
        string result;
        bool exists = kv->containsKey(key);
        if (!exists)
        {
            return Value::null();
        }
        return Value(kv->getBool(key));
    });

    CREATE_FUNCTION("removeValueMMKV", 2, {
        MMKV *kv = getInstance(std_string(arguments[1]));
        if (!kv)
        {
            return Value::undefined();
        }

        string key = std_string(arguments[0]);

        kv->removeValueForKey(key);
        removeFromIndex(kv, key);

        return Value(true);
    });

    CREATE_FUNCTION("removeValuesMMKV", 2, {
        MMKV *kv = getInstance(std_string(arguments[1]));
        auto keys = arguments[0].getObject(runtime).asArray(runtime);

        if (!kv)
        {
            return Value::undefined();
        }

        std::vector<std::string> keys_vec = {};
        auto size = keys.length(runtime);
        for (int i = 0; i < size; i++)
        {
            auto key = std_string(keys.getValueAtIndex(runtime, i));
            keys_vec.push_back(key);
        }

        kv->removeValuesForKeys(keys_vec);
        removeKeysFromIndex(kv, keys_vec);

        return Value(true);
    });

    CREATE_FUNCTION("getAllKeysMMKV", 1, {
        MMKV *kv = getInstance(std_string(arguments[0]));
        if (!kv)
        {
            return Value::undefined();
        }
        auto keys = kv->allKeys();

        auto array = jsi::Array(runtime, keys.size());
        auto size = keys.size();
        for (int i = 0; i < size; i++)
        {
            auto string = jsi::String::createFromUtf8(runtime, keys[i]);
            array.setValueAtIndex(runtime, i, string);
        }
        return array;
    });

    CREATE_FUNCTION("getIndexMMKV", 2, {
        MMKV *kv = getInstance(std_string(arguments[1]));
        if (!kv)
        {
            return Value::undefined();
        }

        auto keys = getIndex(kv, std_string(arguments[0]));
        auto size = keys.size();
        auto array = jsi::Array(runtime, size);
        for (int i = 0; i < size; i++)
        {
            auto string = jsi::String::createFromUtf8(runtime, keys[i]);
            array.setValueAtIndex(runtime, i, string);
        }
        return array;
    });

    CREATE_FUNCTION("containsKeyMMKV", 2, {
        MMKV *kv = getInstance(std_string(arguments[1]));
        if (!kv)
        {
            return Value::undefined();
        }
        return Value(kv->containsKey(std_string(arguments[0])));
    });

    CREATE_FUNCTION("clearMMKV", 1, {
        MMKV *kv = getInstance(std_string(arguments[0]));
        if (!kv)
        {
            return Value::undefined();
        }
        kv->clearAll();
        initIndexForId(kv->mmapID());

        return Value(true);
    });

    CREATE_FUNCTION("clearMemoryCache", 1, {
        MMKV *kv = getInstance(std_string(arguments[0]));
        if (!kv)
        {
            return Value::undefined();
        }
        kv->clearMemoryCache();
        return Value(true);
    });

    CREATE_FUNCTION("encryptMMKV", 2, {
        MMKV *kv = getInstance(std_string(arguments[1]));
        if (!kv)
        {
            return Value::undefined();
        }

        string cryptKey = std_string(arguments[0]);
        bool result = kv->reKey(cryptKey);
        return Value(result);
    });

    CREATE_FUNCTION("decryptMMKV", 1, {
        MMKV *kv = getInstance(std_string(arguments[0]));
        if (!kv)
        {
            return Value::undefined();
        }
        kv->reKey("");
        return Value(true);
    });
}

extern "C" JNIEXPORT jlong JNICALL
Java_com_ammarahmed_mmkv_MMKV_getMMKVWithID(JNIEnv *env, jclass clazz, jstring mmapID, jint mode,
                                            jstring cryptKey, jstring rootPath)
{
    MMKV *kv = nullptr;
    if (!mmapID)
    {
        return (jlong)kv;
    }
    string str = jstring2string(env, mmapID);

    bool done = false;
    if (cryptKey)
    {
        string crypt = jstring2string(env, cryptKey);
        if (crypt.length() > 0)
        {
            if (rootPath)
            {
                string path = jstring2string(env, rootPath);
                kv = MMKV::mmkvWithID(str, mmkv::DEFAULT_MMAP_SIZE, (MMKVMode)mode, &crypt, &path);
            }
            else
            {
                kv = MMKV::mmkvWithID(str, mmkv::DEFAULT_MMAP_SIZE, (MMKVMode)mode, &crypt,
                                      nullptr);
            }
            done = true;
        }
    }
    if (!done)
    {
        if (rootPath)
        {
            string path = jstring2string(env, rootPath);
            kv = MMKV::mmkvWithID(str, mmkv::DEFAULT_MMAP_SIZE, (MMKVMode)mode, nullptr, &path);
        }
        else
        {
            kv = MMKV::mmkvWithID(str, mmkv::DEFAULT_MMAP_SIZE, (MMKVMode)mode, nullptr, nullptr);
        }
    }

    return (jlong)kv;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_com_ammarahmed_mmkv_MMKV_containsKey(JNIEnv *env, jobject instance, jlong handle,
                                          jstring oKey)
{
    MMKV *kv = reinterpret_cast<MMKV *>(handle);
    if (kv && oKey)
    {
        string key = jstring2string(env, oKey);
        return (jboolean)kv->containsKey(key);
    }
    return (jboolean) false;
}

extern "C" JNIEXPORT jbyteArray JNICALL
Java_com_ammarahmed_mmkv_MMKV_decodeBytes(JNIEnv *env, jobject obj, jlong handle, jstring oKey)
{
    MMKV *kv = reinterpret_cast<MMKV *>(handle);
    if (kv && oKey)
    {
        string key = jstring2string(env, oKey);
        mmkv::MMBuffer value = kv->getBytes(key);
        if (value.length() > 0)
        {
            jbyteArray result = env->NewByteArray(value.length());
            env->SetByteArrayRegion(result, 0, value.length(), (const jbyte *)value.getPtr());
            return result;
        }
    }
    return nullptr;
}

extern "C" JNIEXPORT void JNICALL
Java_com_ammarahmed_mmkv_MMKV_removeValueForKey(JNIEnv *env, jobject instance, jlong handle,
                                                jstring oKey)
{
    MMKV *kv = reinterpret_cast<MMKV *>(handle);
    if (kv && oKey)
    {
        string key = jstring2string(env, oKey);
        kv->removeValueForKey(key);
    }
}

extern "C"
JNIEXPORT jstring JNICALL
Java_com_ammarahmed_mmkv_MMKV_decodeString(JNIEnv *env, jobject obj, jlong handle, jstring oKey,
                                           jstring default_value) {
    MMKV *kv = reinterpret_cast<MMKV *>(handle);
    if (kv && oKey) {
        string key = jstring2string(env, oKey);
        string value;
        if (kv->getString(key, value)) {
            return string2jstring(env, value);
        }
    }
    return default_value;
}

extern "C" JNIEXPORT jobjectArray JNICALL
Java_com_ammarahmed_mmkv_MMKV_decodeStringSet(JNIEnv *env, jobject, jlong handle, jstring oKey)
{
    MMKV *kv = reinterpret_cast<MMKV *>(handle);
    if (kv && oKey)
    {
        string key = jstring2string(env, oKey);
        vector<string> value;
        bool hasValue = kv->getVector(key, value);
        if (hasValue)
        {
            return vector2jarray(env, value);
        }
    }
    return nullptr;
}

extern "C" JNIEXPORT jint JNICALL
Java_com_ammarahmed_mmkv_MMKV_decodeInt(JNIEnv *env, jobject obj, jlong handle, jstring oKey,
                                        jint defaultValue)
{
    MMKV *kv = reinterpret_cast<MMKV *>(handle);
    if (kv && oKey)
    {
        string key = jstring2string(env, oKey);
        return (jint)kv->getInt32(key, defaultValue);
    }
    return defaultValue;
}

extern "C"
JNIEXPORT jdouble JNICALL
Java_com_ammarahmed_mmkv_MMKV_decodeDouble(JNIEnv *env, jobject obj, jlong handle, jstring oKey,
                                           jdouble default_value) {
    MMKV *kv = reinterpret_cast<MMKV *>(handle);
    if (kv && oKey) {
        string key = jstring2string(env, oKey);
        bool hasValue;
        double value = kv->getDouble(key, 0, &hasValue);

        if (hasValue) {
            return value;
        }
    }
    return default_value;
}


extern "C" JNIEXPORT jboolean JNICALL
Java_com_ammarahmed_mmkv_MMKV_checkProcessMode(JNIEnv *env, jclass clazz, jlong handle)
{
    MMKV *kv = reinterpret_cast<MMKV *>(handle);
    if (kv)
    {
        return kv->checkProcessMode();
    }
    return false;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_com_ammarahmed_mmkv_MMKV_encodeString(JNIEnv *env, jobject thiz, jlong handle, jstring oKey,
                                           jstring oValue)
{
    MMKV *kv = reinterpret_cast<MMKV *>(handle);
    if (kv && oKey)
    {
        string key = jstring2string(env, oKey);
        if (oValue)
        {
            string value = jstring2string(env, oValue);
            return (jboolean)kv->set(value, key);
        }
        else
        {
            kv->removeValueForKey(key);
            return (jboolean) true;
        }
    }
    return (jboolean) false;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_com_ammarahmed_mmkv_MMKV_encodeDouble(JNIEnv *env, jobject thiz, jlong handle, jstring oKey,
                                           jdouble value)
{
    MMKV *kv = reinterpret_cast<MMKV *>(handle);
    if (kv && oKey)
    {
        string key = jstring2string(env, oKey);
        return (jboolean)kv->set((double)value, key);
    }
    return (jboolean) false;
}

extern "C"
JNIEXPORT jboolean JNICALL
Java_com_ammarahmed_mmkv_MMKV_encodeInt(JNIEnv *env, jobject thiz, jlong handle, jstring oKey, jint value) {
    MMKV *kv = reinterpret_cast<MMKV *>(handle);
    if (kv && oKey) {
        string key = jstring2string(env, oKey);
        return (jboolean) kv->set((int) value, key);
    }
    return (jboolean) false;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_com_ammarahmed_mmkv_MMKV_encodeSet(JNIEnv *env, jobject thiz, jlong handle, jstring oKey,
                                        jobjectArray arrStr)
{
    MMKV *kv = reinterpret_cast<MMKV *>(handle);
    if (kv && oKey)
    {
        string key = jstring2string(env, oKey);
        if (arrStr)
        {
            vector<string> value = jarray2vector(env, arrStr);
            return (jboolean)kv->set(value, key);
        }
        else
        {
            kv->removeValueForKey(key);
            return (jboolean) true;
        }
    }
    return (jboolean) false;
}

extern "C"
JNIEXPORT jobjectArray JNICALL
Java_com_ammarahmed_mmkv_MMKV_getAllKeys(JNIEnv *env, jobject obj, jlong handle) {
    MMKV *kv = reinterpret_cast<MMKV *>(handle);
    if (!kv) {
        return nullptr;
    }
    auto keys = kv->allKeys();

    return vector2jarray(env, keys);
}

extern "C" JNIEXPORT void JNICALL
Java_com_ammarahmed_mmkv_MMKV_jniInitialize(JNIEnv *env, jclass clazz, jstring rootDir,
                                            jint logLevel)
{
    if (!rootDir)
    {
        return;
    }

    const char *kstr = env->GetStringUTFChars(rootDir, nullptr);
    if (kstr)
    {
        initializeMMKVWithHandlers(kstr, (MMKVLogLevel)logLevel);
        env->ReleaseStringUTFChars(rootDir, kstr);
    }
}

extern "C" JNIEXPORT void JNICALL
Java_com_ammarahmed_mmkv_RNMMKVModule_destroy(JNIEnv *env, jobject thiz)
{
    env->DeleteGlobalRef(mmkvobject);
    vm = nullptr;
}

struct RNMMKVModule : jni::JavaClass<RNMMKVModule>
{
    static constexpr auto kJavaDescriptor = "Lcom/ammarahmed/mmkv/RNMMKVModule;";

    static void registerNatives()
    {
        javaClassStatic()->registerNatives(
            {// initialization for JSI
             makeNativeMethod("nativeInstall",
                              RNMMKVModule::install)});
    }

private:
    static void install(
        jni::alias_ref<jni::JObject> thiz, jlong jsi,
        jni::alias_ref<jni::JString> rootPath)
    {

        rPath = rootPath->toStdString();

        initializeMMKVWithHandlers(rPath);

        jni::Environment::current()->GetJavaVM(&vm);
        auto runtime = reinterpret_cast<jsi::Runtime *>(jsi);

        mmkvobject = jni::Environment::current()->NewGlobalRef(thiz.get());
        if (runtime)
        {
            installBindings(*runtime);
        }
        createInstance("mmkvIDStore", MMKV_SINGLE_PROCESS, "", "");
    }
};

JNIEXPORT jint JNI_OnLoad(JavaVM *jvm, void *)
{
    return jni::initialize(vm, []
                           { RNMMKVModule::registerNatives(); });
}
