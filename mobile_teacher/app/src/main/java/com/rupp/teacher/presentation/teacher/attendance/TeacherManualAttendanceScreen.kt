package com.rupp.teacher.presentation.teacher.attendance

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.rupp.teacher.presentation.teacher.attendance.model.StudentAttendanceRecord
import com.rupp.teacher.presentation.teacher.attendance.model.StudentAttendanceStatus

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TeacherManualAttendanceScreen(
    courseName: String,
    records: List<StudentAttendanceRecord>,
    onStatusChange: (
        studentId: Int,
        status: StudentAttendanceStatus,
        reason: String?
    ) -> Unit,
    onSave: () -> Unit,
    onBack: () -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }
    var selectedFilter by remember {
        mutableStateOf("All")
    }

    val presentCount = records.count {
        it.status == StudentAttendanceStatus.PRESENT
    }
    val lateCount = records.count {
        it.status == StudentAttendanceStatus.LATE
    }
    val absentCount = records.count {
        it.status == StudentAttendanceStatus.ABSENT
    }
    val excusedCount = records.count {
        it.status == StudentAttendanceStatus.EXCUSED
    }

    val filteredRecords = records.filter { student ->
        val matchesSearch =
            student.studentName.contains(searchQuery, true) ||
                    student.studentCode.contains(searchQuery, true)

        val matchesFilter = when (selectedFilter) {
            "Present" -> student.status == StudentAttendanceStatus.PRESENT
            "Late" -> student.status == StudentAttendanceStatus.LATE
            "Absent" -> student.status == StudentAttendanceStatus.ABSENT
            "Permission" -> student.status == StudentAttendanceStatus.EXCUSED
            else -> true
        }

        matchesSearch && matchesFilter
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Manual Attendance") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        },
        bottomBar = {
            Button(
                onClick = onSave,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
                    .height(52.dp),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text("Save Attendance")
            }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(
                start = 16.dp,
                end = 16.dp,
                top = 12.dp,
                bottom = 88.dp
            ),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        text = courseName,
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Select an attendance status for each student.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    ManualSummary("Present", presentCount, Color(0xFF16A34A), Modifier.weight(1f))
                    ManualSummary("Late", lateCount, Color(0xFFD97706), Modifier.weight(1f))
                    ManualSummary("Absent", absentCount, Color(0xFFDC2626), Modifier.weight(1f))
                    ManualSummary("Permission", excusedCount, Color(0xFF2563EB), Modifier.weight(1f))
                }
            }

            item {
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text("Search student") },
                    leadingIcon = {
                        Icon(Icons.Default.Search, contentDescription = null)
                    },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp)
                )
            }

            item {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    listOf("All", "Present", "Late", "Absent", "Permission")
                        .forEach { filter ->
                            FilterChip(
                                selected = selectedFilter == filter,
                                onClick = { selectedFilter = filter },
                                label = { Text(filter) }
                            )
                        }
                }
            }

            item {
                Text(
                    text = "Students (${filteredRecords.size})",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }

            items(filteredRecords, key = { it.studentId }) { student ->
                ManualStudentCard(
                    student = student,
                    onStatusChange = { status, reason ->
                        onStatusChange(student.studentId, status, reason)
                    }
                )
            }
        }
    }
}

@Composable
private fun ManualSummary(
    label: String,
    count: Int,
    color: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(
            containerColor = color.copy(alpha = 0.10f)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 10.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                count.toString(),
                color = color,
                fontWeight = FontWeight.Bold
            )
            Text(
                label,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun ManualStudentCard(
    student: StudentAttendanceRecord,
    onStatusChange: (
        StudentAttendanceStatus,
        String?
    ) -> Unit
) {
    val statusColor = when (student.status) {
        StudentAttendanceStatus.PRESENT -> Color(0xFF16A34A)
        StudentAttendanceStatus.LATE -> Color(0xFFD97706)
        StudentAttendanceStatus.ABSENT -> Color(0xFFDC2626)
        StudentAttendanceStatus.EXCUSED -> Color(0xFF2563EB)
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp)
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        student.studentName,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        student.studentCode,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                Text(
                    student.status.label,
                    color = statusColor,
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.labelMedium
                )
            }

            Text(
                "Set attendance status",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                ManualStatusButton(
                    label = "Present",
                    selected = student.status == StudentAttendanceStatus.PRESENT,
                    color = Color(0xFF16A34A),
                    modifier = Modifier.weight(1f)
                ) {
                    onStatusChange(StudentAttendanceStatus.PRESENT, null)
                }

                ManualStatusButton(
                    label = "Late",
                    selected = student.status == StudentAttendanceStatus.LATE,
                    color = Color(0xFFD97706),
                    modifier = Modifier.weight(1f)
                ) {
                    onStatusChange(StudentAttendanceStatus.LATE, null)
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                ManualStatusButton(
                    label = "Absent",
                    selected = student.status == StudentAttendanceStatus.ABSENT,
                    color = Color(0xFFDC2626),
                    modifier = Modifier.weight(1f)
                ) {
                    onStatusChange(StudentAttendanceStatus.ABSENT, null)
                }

                ManualStatusButton(
                    label = "Permission",
                    selected = student.status == StudentAttendanceStatus.EXCUSED,
                    color = Color(0xFF2563EB),
                    modifier = Modifier.weight(1f)
                ) {
                    onStatusChange(
                        StudentAttendanceStatus.EXCUSED,
                        "Teacher-approved permission"
                    )
                }
            }
        }
    }
}

@Composable
private fun ManualStatusButton(
    label: String,
    selected: Boolean,
    color: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    androidx.compose.material3.OutlinedButton(
        onClick = onClick,
        modifier = modifier,
        shape = RoundedCornerShape(9.dp),
        colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(
            containerColor = if (selected) color.copy(alpha = 0.12f)
            else Color.Transparent,
            contentColor = color
        )
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            maxLines = 1
        )
    }
}