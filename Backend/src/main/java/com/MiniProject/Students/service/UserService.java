package com.MiniProject.Students.service;

import com.MiniProject.Students.dto.UpdateProfileRequest;
import com.MiniProject.Students.dto.UserProfileResponse;
import com.MiniProject.Students.model.User;
import com.MiniProject.Students.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    /** Returns the profile of the user identified by JWT subject (email). */
    public UserProfileResponse getProfile(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
        return toResponse(user);
    }

    /** Updates all editable profile fields for the authenticated user. */
    public UserProfileResponse updateProfile(String currentEmail, UpdateProfileRequest req) {
        User user = userRepository.findByEmail(currentEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Handle email change — reject if already taken by someone else
        String newEmail = req.getEmail().trim();
        if (!newEmail.equalsIgnoreCase(currentEmail)) {
            if (userRepository.findByEmail(newEmail).isPresent()) {
                throw new IllegalArgumentException("Email already in use");
            }
            user.setEmail(newEmail);
        }

        user.setName(req.getName().trim());

        // Optional fields — only update when provided (non-null)
        if (req.getPhone()    != null) user.setPhone(req.getPhone().trim());
        if (req.getSemester() != null) user.setSemester(req.getSemester().trim());
        if (req.getBranch()   != null) user.setBranch(req.getBranch().trim());

        userRepository.save(user);
        return toResponse(user);
    }

    private UserProfileResponse toResponse(User u) {
        return new UserProfileResponse(
            u.getId(), u.getName(), u.getEmail(), u.getProvider(),
            u.getPhone(), u.getSemester(), u.getBranch()
        );
    }
}
