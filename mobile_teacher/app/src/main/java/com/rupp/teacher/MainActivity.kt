
package com.rupp.teacher

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.lifecycle.ViewModelProvider
import com.rupp.teacher.core.network.ApiClient
import com.rupp.teacher.core.storage.TokenManager
import com.rupp.teacher.core.theme.SmartAttendanceTheme
import com.rupp.teacher.data.remote.api.AuthApi
import com.rupp.teacher.data.remote.api.TeacherApi
import com.rupp.teacher.data.repository.AuthRepositoryImpl
import com.rupp.teacher.data.repository.TeacherRepositoryImpl
import com.rupp.teacher.presentation.auth.login.LoginViewModel
import com.rupp.teacher.presentation.auth.login.LoginViewModelFactory
import com.rupp.teacher.presentation.teacher.dashboard.TeacherViewModelFactory


class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val retrofit = ApiClient.getInstance(applicationContext)

        val authApi = retrofit.create(AuthApi::class.java)

        val tokenManager = TokenManager(applicationContext)

        val repository = AuthRepositoryImpl(
            authApi = authApi,
            tokenManager = tokenManager
        )

        val teacherApi = retrofit.create(TeacherApi::class.java)

        val teacherRepository = TeacherRepositoryImpl(
            teacherApi = teacherApi
        )

        val teacherViewModelFactory = TeacherViewModelFactory(
            repository = teacherRepository
        )

        val factory = LoginViewModelFactory(repository)
        val loginViewModel = ViewModelProvider(this, factory)
            .get(LoginViewModel::class.java)

        setContent {
            SmartAttendanceApp(
                loginViewModel = loginViewModel,
                teacherViewModelFactory = teacherViewModelFactory
            )
        }
    }
}
