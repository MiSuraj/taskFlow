package com.taskflow.identity.web;

import com.taskflow.identity.dto.CreateUserRequest;
import com.taskflow.identity.dto.InviteUserRequest;
import com.taskflow.identity.dto.LoginRequest;
import com.taskflow.identity.dto.LoginResponse;
import com.taskflow.identity.dto.UserResponse;
import com.taskflow.identity.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/create-user")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody CreateUserRequest request) {
        return ResponseEntity.status(201).body(UserResponse.from(authService.createUser(request)));
    }

    @PostMapping("/invite")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<UserResponse> invite(@Valid @RequestBody InviteUserRequest request) {
        return ResponseEntity.status(201).body(UserResponse.from(authService.invite(request)));
    }
}
