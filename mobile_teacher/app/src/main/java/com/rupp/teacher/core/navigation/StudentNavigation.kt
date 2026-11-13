
package com.rupp.teacher.core.navigation

import androidx.navigation.NavGraphBuilder
import androidx.navigation.compose.composable
import androidx.navigation.navigation
import com.rupp.teacher.presentation.student.dashboard.StudentDashboardScreen

fun NavGraphBuilder.studentNavigation() {

    navigation(
        route = AppRoutes.STUDENT_GRAPH,
        startDestination = AppRoutes.STUDENT_DASHBOARD
    ) {

        composable(AppRoutes.STUDENT_DASHBOARD) {
            StudentDashboardScreen()
        }
    }
}
