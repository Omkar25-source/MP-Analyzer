package com.MiniProject.Students.controller;

import com.MiniProject.Students.dto.DashboardStatsResponse;
import com.MiniProject.Students.dto.StudyLogRequest;
import com.MiniProject.Students.dto.StudyLogResponse;
import com.MiniProject.Students.service.StudySessionService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/study")
@CrossOrigin(originPatterns = "*")
public class StudySessionController {

    @Autowired
    private StudySessionService studySessionService;

    /**
     * POST /api/study/log
     * Body: { subjectId, durationMinutes, date, notes? }
     */
    @PostMapping("/log")
    public ResponseEntity<StudyLogResponse> logSession(
            @Valid @RequestBody StudyLogRequest req,
            Authentication auth) {
        StudyLogResponse saved = studySessionService.addStudySession(auth.getName(), req);
        return ResponseEntity.status(201).body(saved);
    }

    /**
     * GET /api/study/daily?date=YYYY-MM-DD
     * Defaults to today if date not supplied.
     */
    @GetMapping("/daily")
    public ResponseEntity<List<StudyLogResponse>> getDaily(
            @RequestParam(required = false) String date,
            Authentication auth) {
        String target = (date != null && !date.isBlank()) ? date : LocalDate.now().toString();
        List<StudyLogResponse> sessions = studySessionService.getDailySessions(auth.getName(), target);
        return ResponseEntity.ok(sessions);
    }

    /**
     * GET /api/study/stats
     * Returns dashboard-ready aggregation: todayMinutes, weekMinutes, streak, subjectBreakdown.
     */
    @GetMapping("/stats")
    public ResponseEntity<DashboardStatsResponse> getStats(Authentication auth) {
        return ResponseEntity.ok(studySessionService.getDashboardStats(auth.getName()));
    }
}
