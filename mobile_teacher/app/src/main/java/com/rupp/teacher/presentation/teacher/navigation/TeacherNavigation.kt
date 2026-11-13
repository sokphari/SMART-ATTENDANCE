
package com.rupp.teacher.presentation.teacher.navigation

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.School
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import androidx.navigation.navigation
import com.rupp.teacher.core.navigation.AppRoutes
import com.rupp.teacher.presentation.teacher.attendance.TeacherAttendanceDetailScreen
import com.rupp.teacher.presentation.teacher.attendance.TeacherAttendanceScreen
import com.rupp.teacher.presentation.teacher.attendance.TeacherManualAttendanceScreen
import com.rupp.teacher.presentation.teacher.attendance.TeacherQrAttendanceScreen
import com.rupp.teacher.presentation.teacher.attendance.data.TeacherAttendanceData
import com.rupp.teacher.presentation.teacher.attendance.data.TeacherAttendanceRecordData
import com.rupp.teacher.presentation.teacher.attendance.state.AttendanceSessionState
import com.rupp.teacher.presentation.teacher.courses.TeacherCoursesScreen
import com.rupp.teacher.presentation.teacher.dashboard.TeacherDashboardScreen
import com.rupp.teacher.presentation.teacher.dashboard.TeacherDashboardViewModel
import com.rupp.teacher.presentation.teacher.dashboard.TeacherViewModelFactory
import com.rupp.teacher.presentation.teacher.profile.TeacherProfileScreen

private object TeacherRoutes {

    const val HOME = "teacher_home"
    const val COURSES = "teacher_courses"
    const val ATTENDANCE = "teacher_attendance"
    const val PROFILE = "teacher_profile"

    const val ATTENDANCE_DETAIL = "attendance_detail/{sessionId}"
    const val MANUAL_ATTENDANCE = "manual_attendance/{sessionId}"
    const val QR_ATTENDANCE = "qr_attendance/{sessionId}"

    fun attendanceDetailRoute(sessionId: Int) =
        "attendance_detail/$sessionId"

    fun manualAttendanceRoute(sessionId: Int) =
        "manual_attendance/$sessionId"

    fun qrAttendanceRoute(sessionId: Int) =
        "qr_attendance/$sessionId"
}

private data class TeacherBottomItem(
    val route: String,
    val label: String,
    val icon: androidx.compose.ui.graphics.vector.ImageVector
)

fun NavGraphBuilder.teacherNavigation(
    viewModelFactory: TeacherViewModelFactory,
    onLogout: () -> Unit
) {
    navigation(
        route = AppRoutes.TEACHER_GRAPH,
        startDestination = TeacherRoutes.HOME
    ) {
        composable(TeacherRoutes.HOME) {

            val dashboardViewModel: TeacherDashboardViewModel =
                viewModel(factory = viewModelFactory)

            TeacherNavigation(
                viewModel = dashboardViewModel,
                onLogout = onLogout
            )
        }
    }
}

@Composable
private fun TeacherNavigation(
    viewModel: TeacherDashboardViewModel,
    onLogout: () -> Unit
) {

    val navController = rememberNavController()

    // Shared attendance records for detail and manual attendance screens.
    val attendanceState = remember {
        AttendanceSessionState(
            initialRecords = TeacherAttendanceRecordData.records
        )
    }

    // QR token state.
    // This is temporary local state, not yet connected to Laravel.
    var currentQrToken by remember {
        mutableStateOf<String?>(null)
    }

    val bottomItems = listOf(
        TeacherBottomItem(
            TeacherRoutes.HOME,
            "Home",
            Icons.Default.Home
        ),
        TeacherBottomItem(
            TeacherRoutes.COURSES,
            "Courses",
            Icons.Default.School
        ),
        TeacherBottomItem(
            TeacherRoutes.ATTENDANCE,
            "Attendance",
            Icons.Default.CalendarMonth
        ),
        TeacherBottomItem(
            TeacherRoutes.PROFILE,
            "Profile",
            Icons.Default.Person
        )
    )

    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination

    // Hide bottom navigation on detail and attendance action screens.
    val showBottomBar = currentDestination?.route in bottomItems.map {
        it.route
    }

    Scaffold (
        containerColor = MaterialTheme.colorScheme.background,

        bottomBar = {
            if (showBottomBar) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.surface)
                        .height(76.dp),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {

                    bottomItems.forEach { item ->

                        val selected = currentDestination
                            ?.hierarchy
                            ?.any { it.route == item.route } == true

                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxSize()
                                .clickable {
                                    navController.navigate(item.route) {
                                        popUpTo(
                                            navController.graph.findStartDestination().id
                                        ) {
                                            saveState = true
                                        }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                },
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {

                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp)
                                    .height(2.dp)
                                    .background(
                                        if (selected) {
                                            MaterialTheme.colorScheme.primary
                                        } else {
                                            Color.Transparent
                                        }
                                    )
                            )

                            Spacer(modifier = Modifier.height(12.dp))

                            Icon(
                                imageVector = item.icon,
                                contentDescription = item.label,
                                tint = if (selected) {
                                    MaterialTheme.colorScheme.primary
                                } else {
                                    MaterialTheme.colorScheme.onSurfaceVariant
                                },
                                modifier = Modifier.size(24.dp)
                            )

                            Spacer(modifier = Modifier.height(5.dp))

                            Text(
                                text = item.label,
                                style = MaterialTheme.typography.labelMedium,
                                color = if (selected) {
                                    MaterialTheme.colorScheme.primary
                                } else {
                                    MaterialTheme.colorScheme.onSurfaceVariant
                                }
                            )
                        }
                    }
                }
            }
        }
    ) { innerPadding ->

        NavHost(
            navController = navController,
            startDestination = TeacherRoutes.HOME,
            modifier = Modifier.padding(innerPadding)
        ) {

            // -------------------------------------------------
            // HOME
            // -------------------------------------------------

            composable(TeacherRoutes.HOME) {

                TeacherDashboardScreen(
                    viewModel = viewModel
                )
            }

            // -------------------------------------------------
            // COURSES
            // -------------------------------------------------

            composable(TeacherRoutes.COURSES) {

                TeacherCoursesScreen()
            }

            // -------------------------------------------------
            // ATTENDANCE
            // -------------------------------------------------

            composable(TeacherRoutes.ATTENDANCE) {

                TeacherAttendanceScreen(
                    onCreateSession = {
                        // TODO: Navigate to Create Attendance Session.
                    },
                    onSessionClick = { sessionId ->
                        navController.navigate(
                            TeacherRoutes.attendanceDetailRoute(sessionId)
                        )
                    }
                )
            }

            // -------------------------------------------------
            // PROFILE
            // -------------------------------------------------

            composable(TeacherRoutes.PROFILE) {

                TeacherProfileScreen(
                    onLogout = onLogout
                )
            }

            // -------------------------------------------------
            // ATTENDANCE DETAIL
            // -------------------------------------------------

            composable(
                route = TeacherRoutes.ATTENDANCE_DETAIL,
                arguments = listOf(
                    navArgument("sessionId") {
                        type = NavType.IntType
                    }
                )
            ) { backStackEntry ->

                val sessionId = backStackEntry.arguments
                    ?.getInt("sessionId")

                val session = TeacherAttendanceData.sessions
                    .firstOrNull { it.id == sessionId }

                if (session != null) {

                    TeacherAttendanceDetailScreen(
                        session = session,
                        students = attendanceState.records,

                        onBack = {
                            navController.popBackStack()
                        },

                        onManualAttendance = {
                            navController.navigate(
                                TeacherRoutes.manualAttendanceRoute(session.id)
                            )
                        },

                        onQrAttendance = {
                            currentQrToken = null

                            navController.navigate(
                                TeacherRoutes.qrAttendanceRoute(session.id)
                            )
                        }
                    )
                }
            }

            // -------------------------------------------------
            // MANUAL ATTENDANCE
            // -------------------------------------------------

            composable(
                route = TeacherRoutes.MANUAL_ATTENDANCE,
                arguments = listOf(
                    navArgument("sessionId") {
                        type = NavType.IntType
                    }
                )
            ) { backStackEntry ->

                val sessionId = backStackEntry.arguments
                    ?.getInt("sessionId")

                val session = TeacherAttendanceData.sessions
                    .firstOrNull { it.id == sessionId }

                if (session != null) {

                    TeacherManualAttendanceScreen(
                        courseName = session.courseName,
                        records = attendanceState.records,

                        onStatusChange = { studentId, status, reason ->

                            attendanceState.updateStatus(
                                studentId = studentId,
                                status = status,
                                reason = reason
                            )
                        },

                        onSave = {
                            // TODO: Save attendance to Laravel.
                            navController.popBackStack()
                        },

                        onBack = {
                            navController.popBackStack()
                        }
                    )
                }
            }

            // -------------------------------------------------
            // QR ATTENDANCE
            // -------------------------------------------------

            composable(
                route = TeacherRoutes.QR_ATTENDANCE,
                arguments = listOf(
                    navArgument("sessionId") {
                        type = NavType.IntType
                    }
                )
            ) { backStackEntry ->

                val sessionId = backStackEntry.arguments
                    ?.getInt("sessionId")

                val session = TeacherAttendanceData.sessions
                    .firstOrNull { it.id == sessionId }

                if (session != null) {

                    TeacherQrAttendanceScreen(
                        courseName = session.courseName,
                        qrToken = currentQrToken,
                        isGenerating = false,

                        onGenerateQr = {
                            // TODO:
                            // Call Laravel:
                            // POST /api/v1/teacher/attendance-sessions/{id}/qr-token
                        },

                        onRefreshRecords = {
                            // TODO: Refresh attendance records from Laravel.
                        },

                        onBack = {
                            navController.popBackStack()
                        }
                    )
                }
            }
        }
    }
}
