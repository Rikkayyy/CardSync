package com.cardsync.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    @GetMapping("/api/auth/ping")
    public String authPing() {
        return "auth ok";
    }
}
