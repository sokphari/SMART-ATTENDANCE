
package com.rupp.teacher

import androidx.compose.runtime.Composable
import com.rupp.teacher.core.navigation.AppNavigation
import com.rupp.teacher.core.theme.SmartAttendanceTheme
import com.rupp.teacher.presentation.auth.login.LoginViewModel
import com.rupp.teacher.presentation.teacher.dashboard.TeacherViewModelFactory

@Composable
fun SmartAttendanceApp(
    loginViewModel: LoginViewModel,
    teacherViewModelFactory: TeacherViewModelFactory
) {
    SmartAttendanceTheme {
        AppNavigation(
            loginViewModel = loginViewModel,
            teacherViewModelFactory = teacherViewModelFactory
        )
    }
}
