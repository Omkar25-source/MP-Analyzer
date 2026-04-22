package com.MiniProject.Students.controller;

import com.MiniProject.Students.dto.AttendanceRequest;
import com.MiniProject.Students.model.AttendanceRecord;
import com.MiniProject.Students.model.Subject;
import com.MiniProject.Students.model.User;
import com.MiniProject.Students.repository.AttendanceRepository;
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
@RequestMapping("/api/attendance")
@CrossOrigin(originPatterns = "*")
public class AttendanceController {

    @Autowired private AttendanceRepository attendanceRepository;
    @Autowired private SubjectRepository    subjectRepository;
    @Autowired private UserRepository       userRepository;

    /**
     * POST /api/attendance
     * Body: { subjectId, date, status }
     * User is always extracted from JWT — never trusted from the request.
     */
    @PostMapping
    public ResponseEntity<?> markAttendance(@Valid @RequestBody AttendanceRequest req,
                                            Authentication auth) {
        User user = resolveUser(auth);

        // Validate subject belongs to this user
        Subject subject = subjectRepository.findById(req.getSubjectId())
                .orElse(null);

        if (subject == null || !subject.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "Subject not found or access denied"));
        }

        String status = req.getStatus().toUpperCase();
        if (!List.of("PRESENT", "ABSENT", "LATE").contains(status)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid status. Use PRESENT, ABSENT or LATE"));
        }

        AttendanceRecord record = new AttendanceRecord();
        record.setUser(user);
        record.setSubject(subject);
        record.setDate(req.getDate());
        record.setStatus(status);
        AttendanceRecord saved = attendanceRepository.save(record);

        return ResponseEntity.status(201).body(toMap(saved));
    }

    /**
     * GET /api/attendance
     * Optional query param: ?subjectId=123
     * Returns all attendance records for the logged-in user.
     */
    @GetMapping
    public ResponseEntity<?> getAttendance(@RequestParam(required = false) Long subjectId,
                                           Authentication auth) {
        User user = resolveUser(auth);

        List<AttendanceRecord> records;

        if (subjectId != null) {
            Subject subject = subjectRepository.findById(subjectId).orElse(null);
            if (subject == null || !subject.getUser().getId().equals(user.getId())) {
                return ResponseEntity.status(403).body(Map.of("error", "Subject not found or access denied"));
            }
            records = attendanceRepository.findByUserAndSubject(user, subject);
        } else {
            records = attendanceRepository.findByUser(user);
        }

        return ResponseEntity.ok(records.stream().map(this::toMap).toList());
    }

    /**
     * DELETE /api/attendance/{id}
     * Deletes one attendance record belonging to the logged-in user.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAttendance(@PathVariable Long id,
                                              Authentication auth) {
        User user = resolveUser(auth);

        AttendanceRecord record = attendanceRepository.findByIdAndUser(id, user)
                .orElse(null);

        if (record == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Attendance record not found"));
        }

        attendanceRepository.delete(record);
        return ResponseEntity.ok(Map.of("message", "Attendance deleted"));
    }

    /* ── helpers ── */

    private User resolveUser(Authentication auth) {
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private Map<String, Object> toMap(AttendanceRecord r) {
        return Map.of(
            "id",          r.getId(),
            "date",        r.getDate(),
            "status",      r.getStatus(),
            "subjectId",   r.getSubject().getId(),
            "subjectName", r.getSubject().getName()
        );
    }
}
