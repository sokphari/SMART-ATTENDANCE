
package com.rupp.teacher.presentation.teacher.attendance

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.QrCode
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.rupp.teacher.presentation.teacher.attendance.model.StudentAttendanceRecord
import com.rupp.teacher.presentation.teacher.attendance.model.StudentAttendanceStatus
import com.rupp.teacher.presentation.teacher.attendance.model.TeacherAttendanceSession

private enum class AttendanceDetailFilter(val label: String) {
    ALL("All"),
    PRESENT("Present"),
    LATE("Late"),
    ABSENT("Absent"),
    EXCUSED("Excused")
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TeacherAttendanceDetailScreen(
    session: TeacherAttendanceSession,
    students: List<StudentAttendanceRecord>,
    onManualAttendance: () -> Unit,
    onQrAttendance: () -> Unit,
    onBack: () -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }
    var selectedFilter by remember {
        mutableStateOf(AttendanceDetailFilter.ALL)
    }

    val presentCount = students.count {
        it.status == StudentAttendanceStatus.PRESENT
    }

    val lateCount = students.count {
        it.status == StudentAttendanceStatus.LATE
    }

    val absentCount = students.count {
        it.status == StudentAttendanceStatus.ABSENT
    }

    val filteredStudents = students.filter { student ->
        val matchesSearch =
            student.studentName.contains(searchQuery, ignoreCase = true) ||
                    student.studentCode.contains(searchQuery, ignoreCase = true)

        val matchesFilter = when (selectedFilter) {
            AttendanceDetailFilter.ALL -> true
            AttendanceDetailFilter.PRESENT ->
                student.status == StudentAttendanceStatus.PRESENT
            AttendanceDetailFilter.LATE ->
                student.status == StudentAttendanceStatus.LATE
            AttendanceDetailFilter.ABSENT ->
                student.status == StudentAttendanceStatus.ABSENT
            AttendanceDetailFilter.EXCUSED ->
                student.status == StudentAttendanceStatus.EXCUSED
        }

        matchesSearch && matchesFilter
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text("Attendance Details")
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = "Back"
                        )
                    }
                }
            )
        }
    ) { innerPadding ->

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {

            // Course information
            item {
                Column(
                    modifier = Modifier.padding(
                        start = 16.dp,
                        end = 16.dp,
                        top = 8.dp
                    )
                ) {
                    Text(
                        text = session.courseName,
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = "${session.courseCode} • ${session.className}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = session.date,
                            style = MaterialTheme.typography.bodySmall
                        )

                        Text(
                            text = "${session.startTime} - ${session.endTime}",
                            style = MaterialTheme.typography.bodySmall
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = if (
                            session.status ==
                            com.rupp.teacher.presentation.teacher.attendance.model.AttendanceSessionStatus.OPEN
                        ) {
                            Color(0xFFE8F5E9)
                        } else {
                            MaterialTheme.colorScheme.surfaceVariant
                        }
                    ) {
                        Text(
                            text = session.status.name,
                            modifier = Modifier.padding(
                                horizontal = 12.dp,
                                vertical = 6.dp
                            ),
                            color = if (
                                session.status ==
                                com.rupp.teacher.presentation.teacher.attendance.model.AttendanceSessionStatus.OPEN
                            ) {
                                Color(0xFF2E7D32)
                            } else {
                                MaterialTheme.colorScheme.onSurfaceVariant
                            },
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            // Manual and QR Attendance Actions
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Button(
                        onClick = onManualAttendance,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(
                            imageVector = Icons.Default.Edit,
                            contentDescription = null
                        )

                        Spacer(modifier = Modifier.size(8.dp))

                        Text("Manual Attendance")
                    }

                    OutlinedButton(
                        onClick = onQrAttendance,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(
                            imageVector = Icons.Default.QrCode,
                            contentDescription = null
                        )

                        Spacer(modifier = Modifier.size(8.dp))

                        Text("QR Code Attendance")
                    }
                }
            }

            // Attendance summary
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    AttendanceCountCard(
                        title = "Present",
                        count = presentCount,
                        color = Color(0xFF16A34A),
                        modifier = Modifier.weight(1f)
                    )

                    AttendanceCountCard(
                        title = "Late",
                        count = lateCount,
                        color = Color(0xFFD97706),
                        modifier = Modifier.weight(1f)
                    )

                    AttendanceCountCard(
                        title = "Absent",
                        count = absentCount,
                        color = Color(0xFFDC2626),
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            // Search
            item {
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    placeholder = {
                        Text("Search student name or ID")
                    },
                    leadingIcon = {
                        Icon(
                            imageVector = Icons.Default.Search,
                            contentDescription = null
                        )
                    },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp)
                )
            }

            // Filters
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    AttendanceDetailFilter.entries.forEach { filter ->
                        FilterChip(
                            selected = selectedFilter == filter,
                            onClick = {
                                selectedFilter = filter
                            },
                            label = {
                                Text(filter.label)
                            }
                        )
                    }
                }
            }

            // Student count
            item {
                Text(
                    text = "Students (${filteredStudents.size})",
                    modifier = Modifier.padding(horizontal = 16.dp),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }

            // Student list
            if (filteredStudents.isEmpty()) {
                item {
                    Text(
                        text = "No students found.",
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp),
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            } else {
                items(
                    items = filteredStudents,
                    key = { it.studentId }
                ) { student ->
                    StudentAttendanceItem(
                        student = student,
                        modifier = Modifier.padding(horizontal = 16.dp)
                    )
                }
            }

            item {
                Spacer(modifier = Modifier.height(8.dp))
            }
        }
    }
}

@Composable
private fun AttendanceCountCard(
    title: String,
    count: Int,
    color: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(
            containerColor = color.copy(alpha = 0.10f)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = count.toString(),
                color = color,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold
            )

            Text(
                text = title,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.labelMedium
            )
        }
    }
}


@Composable
private fun StudentAttendanceItem(
    student: StudentAttendanceRecord,
    modifier: Modifier = Modifier
) {
    // Status color
    val statusColor = when (student.status) {
        StudentAttendanceStatus.PRESENT -> Color(0xFF16A34A)
        StudentAttendanceStatus.LATE -> Color(0xFFD97706)
        StudentAttendanceStatus.ABSENT -> Color(0xFFDC2626)
        StudentAttendanceStatus.EXCUSED -> Color(0xFF2563EB)
    }

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(
            defaultElevation = 1.dp
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Student avatar
            Surface(
                modifier = Modifier.size(44.dp),
                shape = CircleShape,
                color = MaterialTheme.colorScheme.primary.copy(alpha = 0.10f)
            ) {
                Column(
                    modifier = Modifier.fillMaxSize(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Text(
                        text = student.studentName
                            .split(" ")
                            .mapNotNull { it.firstOrNull()?.toString() }
                            .take(2)
                            .joinToString(""),
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            // Student information
            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(start = 12.dp)
            ) {
                Text(
                    text = student.studentName,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.SemiBold
                )

                Text(
                    text = student.studentCode,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                student.checkedInAt?.let { time ->
                    Text(
                        text = "Checked in: $time",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // Attendance status
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = statusColor.copy(alpha = 0.10f)
            ) {
                Text(
                    text = student.status.label,
                    modifier = Modifier.padding(
                        horizontal = 9.dp,
                        vertical = 6.dp
                    ),
                    color = statusColor,
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}
