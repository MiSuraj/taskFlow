package com.taskflow.identity.service;

import com.taskflow.identity.dto.UserResponse;
import com.taskflow.identity.repository.UserRepository;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /** Any authenticated tenant member can list usernames/roles — needed for assignee pickers, chat, etc. */
    public java.util.List<UserResponse> listUsers() {
        return userRepository.findAll().stream().map(UserResponse::from).toList();
    }
}
