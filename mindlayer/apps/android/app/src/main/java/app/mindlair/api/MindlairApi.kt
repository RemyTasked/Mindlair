package app.mindlair.api

import android.content.Context
import android.util.Log
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.google.gson.Gson
import com.google.gson.annotations.SerializedName
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*
import java.util.concurrent.TimeUnit

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "auth")

interface MindlairApiService {
    
    @POST("auth/magic-link")
    suspend fun requestMagicLink(@Body request: MagicLinkRequest): Response<MagicLinkResponse>
    
    @GET("auth/session")
    suspend fun getSession(): Response<SessionResponse>
    
    @POST("sources/capture")
    suspend fun captureSource(@Body request: CaptureRequest): Response<CaptureResponse>
    
    @POST("positions/quick-react")
    suspend fun quickReact(@Body request: QuickReactRequest): Response<QuickReactResponse>
}

data class MagicLinkRequest(val email: String)
data class MagicLinkResponse(val sent: Boolean, val message: String?)

data class SessionResponse(
    val authenticated: Boolean,
    val user: User?
)

data class User(
    val id: String,
    val email: String,
    val name: String?
)

data class CaptureRequest(
    val url: String?,
    val title: String,
    val source: String,
    val author: String?,
    @SerializedName("contentType") val contentType: String,
    val surface: String,
    val capturedAt: String,
    val durationMs: Long?,
    val metadata: CaptureMetadata?
)

data class CaptureMetadata(
    val packageName: String?,
    val audioFingerprint: String?
)

data class CaptureResponse(
    val success: Boolean,
    val sourceId: String?,
    val alreadyExists: Boolean?
)

data class QuickReactRequest(
    val sourceId: String,
    val stance: String,
    val note: String?
)

data class QuickReactResponse(
    val success: Boolean,
    val positionId: String?
)

class MindlairApi private constructor(
    private val context: Context,
    private val service: MindlairApiService
) {
    
    private val authTokenKey = stringPreferencesKey("auth_token")
    
    val isLoggedIn = context.dataStore.data.map { prefs ->
        prefs[authTokenKey] != null
    }
    
    suspend fun setAuthToken(token: String) {
        context.dataStore.edit { prefs ->
            prefs[authTokenKey] = token
        }
    }
    
    suspend fun clearAuthToken() {
        context.dataStore.edit { prefs ->
            prefs.remove(authTokenKey)
        }
    }
    
    suspend fun getAuthToken(): String? {
        return context.dataStore.data.first()[authTokenKey]
    }
    
    suspend fun requestMagicLink(email: String): Result<Boolean> {
        return try {
            val response = service.requestMagicLink(MagicLinkRequest(email))
            if (response.isSuccessful && response.body()?.sent == true) {
                Result.success(true)
            } else {
                Result.failure(Exception(response.body()?.message ?: "Failed to send magic link"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "requestMagicLink error", e)
            Result.failure(e)
        }
    }
    
    suspend fun getSession(): Result<User?> {
        return try {
            val response = service.getSession()
            if (response.isSuccessful) {
                val body = response.body()
                if (body?.authenticated == true) {
                    Result.success(body.user)
                } else {
                    Result.success(null)
                }
            } else {
                Result.failure(Exception("Failed to get session"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "getSession error", e)
            Result.failure(e)
        }
    }
    
    suspend fun captureSource(request: CaptureRequest): Result<CaptureResponse> {
        return try {
            val response = service.captureSource(request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to capture source"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "captureSource error", e)
            Result.failure(e)
        }
    }
    
    suspend fun quickReact(request: QuickReactRequest): Result<QuickReactResponse> {
        return try {
            val response = service.quickReact(request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to submit reaction"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "quickReact error", e)
            Result.failure(e)
        }
    }
    
    companion object {
        private const val TAG = "MindlairApi"
        private const val BASE_URL = "https://mindlair.app/api/"
        
        fun create(context: Context): MindlairApi {
            val loggingInterceptor = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }
            
            val authInterceptor = Interceptor { chain ->
                val token = context.dataStore.data
                val request = chain.request().newBuilder()
                    .addHeader("Content-Type", "application/json")
                    .build()
                chain.proceed(request)
            }
            
            val client = OkHttpClient.Builder()
                .addInterceptor(loggingInterceptor)
                .addInterceptor(authInterceptor)
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .writeTimeout(30, TimeUnit.SECONDS)
                .build()
            
            val retrofit = Retrofit.Builder()
                .baseUrl(BASE_URL)
                .client(client)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
            
            val service = retrofit.create(MindlairApiService::class.java)
            return MindlairApi(context, service)
        }
    }
}
