package com.rupp.teacher.domain.model

data class QrToken(
    val token: String,
    val expiresAt: String
)