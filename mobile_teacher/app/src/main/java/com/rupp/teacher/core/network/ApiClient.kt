package com.rupp.teacher.core.network

import android.content.Context
import com.google.gson.GsonBuilder
import com.rupp.teacher.core.storage.TokenManager
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {

    @Volatile
    private var retrofit: Retrofit? = null

    fun getInstance(context: Context): Retrofit {

        return retrofit ?: synchronized(this) {

            retrofit ?: createRetrofit(context.applicationContext)
                .also { retrofit = it }
        }
    }

    private fun createRetrofit(context: Context): Retrofit {

        val tokenManager = TokenManager(context)

        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = if (NetworkConfig.DEBUG_LOGGING) {
                HttpLoggingInterceptor.Level.BODY
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }

        val okHttpClient = OkHttpClient.Builder()
            .addInterceptor(AuthInterceptor(tokenManager))
            .addInterceptor(loggingInterceptor)
            .connectTimeout(
                NetworkConfig.CONNECT_TIMEOUT,
                TimeUnit.SECONDS
            )
            .readTimeout(
                NetworkConfig.READ_TIMEOUT,
                TimeUnit.SECONDS
            )
            .writeTimeout(
                NetworkConfig.WRITE_TIMEOUT,
                TimeUnit.SECONDS
            )
            .build()

        val gson = GsonBuilder().create()

        return Retrofit.Builder()
            .baseUrl(NetworkConfig.BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(
                GsonConverterFactory.create(gson)
            )
            .build()
    }
}
