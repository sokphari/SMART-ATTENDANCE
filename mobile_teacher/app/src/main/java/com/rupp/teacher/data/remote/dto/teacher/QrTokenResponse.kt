
package com.rupp.teacher.data.remote.dto.teacher

import com.google.gson.annotations.SerializedName

data class QrTokenResponse(
    val data: QrTokenDto
)

data class QrTokenDto(
    val token: String,

    @SerializedName("expires_at")
    val expiresAt: String
)
