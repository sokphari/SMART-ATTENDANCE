
package com.rupp.teacher.core.navigation

import androidx.navigation.NavGraphBuilder
import androidx.navigation.compose.composable
import androidx.navigation.navigation
import androidx.lifecycle.viewmodel.compose.viewModel
import com.rupp.teacher.presentation.teacher.dashboard.TeacherDashboardViewModel
import com.rupp.teacher.presentation.teacher.dashboard.TeacherDashboardScreen
import com.rupp.teacher.presentation.teacher.dashboard.TeacherViewModelFactory

fun NavGraphBuilder.teacherNavigation(
    viewModelFactory: TeacherViewModelFactory
) {

    navigation(
        route = AppRoutes.TEACHER_GRAPH,
        startDestination = AppRoutes.TEACHER_DASHBOARD
    ) {

        composable(AppRoutes.TEACHER_DASHBOARD) {
            val viewModel: TeacherDashboardViewModel =
                viewModel(factory = viewModelFactory)
            TeacherDashboardScreen(viewModel)
        }
    }
}
