
package com.rupp.teacher.data.remote.dto.teacher

import com.google.gson.annotations.SerializedName

data class CreateSessionRequest(
    @SerializedName("class_section_id")
    val classSectionId: Int,

    @SerializedName("class_schedule_id")
    val classScheduleId: Int? = null,

    @SerializedName("classroom_id")
    val classroomId: Int? = null,

    @SerializedName("session_date")
    val sessionDate: String,

    @SerializedName("starts_at")
    val startsAt: String,

    @SerializedName("late_after")
    val lateAfter: String,

    @SerializedName("closes_at")
    val closesAt: String
)
