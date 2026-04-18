package com.MiniProject.Students.controller;

import com.MiniProject.Students.dto.SubjectRequest;
import com.MiniProject.Students.model.Subject;
import com.MiniProject.Students.model.User;
import com.MiniProject.Students.repository.SubjectRepository;
import com.MiniProject.Students.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/subjects")
@CrossOrigin(originPatterns = "*")
public class SubjectController {

    @Autowired private SubjectRepository subjectRepository;
    @Autowired private UserRepository    userRepository;

    /** POST /api/subjects — create subject for the logged-in user */
    @PostMapping
    public ResponseEntity<?> createSubject(@Valid @RequestBody SubjectRequest req,
                                           Authentication auth) {
        User user = resolveUser(auth);

        // Duplicate guard
        if (subjectRepository.findByNameAndUser(req.getName().trim(), user).isPresent()) {
            return ResponseEntity.status(409).body(Map.of("error", "Subject already exists"));
        }

        Subject subject = new Subject();
        subject.setName(req.getName().trim());
        subject.setUser(user);
        Subject saved = subjectRepository.save(subject);

        return ResponseEntity.status(201).body(Map.of("id", saved.getId(), "name", saved.getName()));
    }

    /** GET /api/subjects — all subjects for the logged-in user */
    @GetMapping
    public ResponseEntity<?> getSubjects(Authentication auth) {
        User user = resolveUser(auth);
        List<Subject> subjects = subjectRepository.findByUser(user);
        return ResponseEntity.ok(
            subjects.stream()
                    .map(s -> Map.of("id", s.getId(), "name", s.getName()))
                    .toList()
        );
    }

    /* ── helper ── */
    private User resolveUser(Authentication auth) {
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
