
package com.rupp.teacher.core.navigation

import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import androidx.navigation.navigation
import com.rupp.teacher.domain.model.User
import com.rupp.teacher.presentation.auth.login.LoginScreen
import com.rupp.teacher.presentation.auth.login.LoginViewModel

fun NavGraphBuilder.authNavigation(
    navController: NavHostController,
    loginViewModel: LoginViewModel,
    onLoginSuccess: (User) -> Unit
) {
    navigation(
        route = AppRoutes.AUTH_GRAPH,
        startDestination = AppRoutes.LOGIN
    ) {
        composable(AppRoutes.LOGIN) {

            LoginScreen(
                viewModel = loginViewModel,
                onLoginSuccess = onLoginSuccess
            )
        }
    }
}
