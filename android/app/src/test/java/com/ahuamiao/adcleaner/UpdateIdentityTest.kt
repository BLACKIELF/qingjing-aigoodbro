package com.ahuamiao.adcleaner

import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test

class UpdateIdentityTest {
    private val installed = UpdateIdentity("com.aigoodbro.qingjing", "1.0.4", 10004, setOf("release-key"))
    private val candidate = installed.copy(version = "1.0.5", code = 10005)

    @Test fun acceptsSameSignerUpgrade() {
        assertNull(installed.rejection(candidate, "1.0.5"))
    }

    @Test fun refusesDifferentAppSignerAndDowngrade() {
        listOf(
            candidate.copy(packageName = "another.app"),
            candidate.copy(signers = setOf("debug-key")),
            candidate.copy(signers = emptySet()),
            candidate.copy(code = 10004),
            candidate.copy(version = "1.0.6"),
        ).forEach { assertNotNull(installed.rejection(it, "1.0.5")) }
    }
}
