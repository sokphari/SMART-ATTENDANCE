
package com.rupp.teacher.core.navigation

import android.widget.Toast
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.rememberNavController
import com.rupp.teacher.domain.model.User
import com.rupp.teacher.presentation.auth.login.LoginViewModel
import com.rupp.teacher.presentation.teacher.dashboard.TeacherViewModelFactory
import com.rupp.teacher.presentation.shared.model.UserRole

object AppRoutes {
    const val AUTH_GRAPH = "auth_graph"
    const val LOGIN = "login"

    const val TEACHER_GRAPH = "teacher_graph"
    const val TEACHER_DASHBOARD = "teacher_dashboard"

    const val STUDENT_GRAPH = "student_graph"
    const val STUDENT_DASHBOARD = "student_dashboard"
}

@Composable
fun AppNavigation(
    loginViewModel: LoginViewModel,
    teacherViewModelFactory: TeacherViewModelFactory
) {
    val navController = rememberNavController()
    val context = LocalContext.current

    NavHost(
        navController = navController,
        startDestination = AppRoutes.AUTH_GRAPH
    ) {

        authNavigation(
            navController = navController,
            loginViewModel = loginViewModel,
            onLoginSuccess = { user: User ->

                when (UserRole.from(user.role)) {

                    UserRole.TEACHER -> {
                        navController.navigate(
                            AppRoutes.TEACHER_GRAPH
                        ) {
                            popUpTo(AppRoutes.AUTH_GRAPH) {
                                inclusive = true
                            }
                            launchSingleTop = true
                        }
                    }

                    UserRole.STUDENT -> {
                        navController.navigate(
                            AppRoutes.STUDENT_GRAPH
                        ) {
                            popUpTo(AppRoutes.AUTH_GRAPH) {
                                inclusive = true
                            }
                            launchSingleTop = true
                        }
                    }

                    UserRole.ADMIN,
                    UserRole.UNKNOWN -> {
                        Toast.makeText(
                            context,
                            "This role is not supported in the mobile app.",
                            Toast.LENGTH_LONG
                        ).show()
                    }
                }
            }
        )

        teacherNavigation(teacherViewModelFactory)

        studentNavigation()
    }
}
