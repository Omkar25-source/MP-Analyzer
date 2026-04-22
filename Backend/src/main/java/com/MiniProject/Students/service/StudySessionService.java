package com.MiniProject.Students.service;

import com.MiniProject.Students.dto.DashboardStatsResponse;
import com.MiniProject.Students.dto.StudyLogRequest;
import com.MiniProject.Students.dto.StudyLogResponse;
import com.MiniProject.Students.model.StudySession;
import com.MiniProject.Students.model.Subject;
import com.MiniProject.Students.model.User;
import com.MiniProject.Students.repository.StudySessionRepository;
import com.MiniProject.Students.repository.SubjectRepository;
import com.MiniProject.Students.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class StudySessionService {

    @Autowired private StudySessionRepository studySessionRepository;
    @Autowired private SubjectRepository      subjectRepository;
    @Autowired private UserRepository         userRepository;

    // ── Write ───────────────────────────────────────────────────────────────

    @Transactional
    public StudyLogResponse addStudySession(String email, StudyLogRequest req) {
        User user = resolveUser(email);

        // Validate subject ownership
        Subject subject = subjectRepository.findById(req.getSubjectId())
                .orElseThrow(() -> new IllegalArgumentException("Subject not found"));
        if (!subject.getUser().getId().equals(user.getId())) {
            throw new SecurityException("Subject does not belong to user");
        }

        // Parse and validate date
        LocalDate date;
        try {
            date = LocalDate.parse(req.getDate());
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid date format. Use YYYY-MM-DD");
        }

        StudySession session = new StudySession();
        session.setUser(user);
        session.setSubject(subject);
        session.setDurationMinutes(req.getDurationMinutes());
        session.setDate(date);
        session.setNotes(req.getNotes());

        StudySession saved = studySessionRepository.save(session);
        return toResponse(saved);
    }

    // ── Read: daily list ─────────────────────────────────────────────────────

    public List<StudyLogResponse> getDailySessions(String email, String dateStr) {
        User user = resolveUser(email);
        LocalDate date = LocalDate.parse(dateStr);
        return studySessionRepository.findByUserAndDate(user, date)
                .stream().map(this::toResponse).toList();
    }

    // ── Read: dashboard stats ─────────────────────────────────────────────────

    public DashboardStatsResponse getDashboardStats(String email) {
        User user = resolveUser(email);
        LocalDate today    = LocalDate.now();
        LocalDate weekAgo  = today.minusDays(6);

        int todayMinutes = studySessionRepository.sumMinutesInRange(user, today, today);
        int weekMinutes  = studySessionRepository.sumMinutesInRange(user, weekAgo, today);

        // Subject breakdown for current week
        List<Object[]> rows = studySessionRepository.sumMinutesBySubject(user, weekAgo, today);
        List<Map<String, Object>> breakdown = new ArrayList<>();
        for (Object[] row : rows) {
            breakdown.add(Map.of(
                "subject", row[0],
                "minutes", ((Number) row[1]).intValue()
            ));
        }

        int streak = calculateStreak(user, today);
        return new DashboardStatsResponse(todayMinutes, weekMinutes, streak, breakdown);
    }

    // ── Streak: consecutive studied days going back from today ───────────────

    private int calculateStreak(User user, LocalDate today) {
        // Fetch distinct dates for the last 90 days only — bounded query
        List<LocalDate> studiedDates =
                studySessionRepository.findStudiedDatesSince(user, today.minusDays(90));

        if (studiedDates.isEmpty()) return 0;

        int streak = 0;
        LocalDate cursor = today;

        for (int i = 0; i <= 90; i++) {
            final LocalDate day = cursor.minusDays(i);
            if (studiedDates.contains(day)) {
                streak++;
            } else {
                // Allow today to be empty (day not over yet)
                if (i == 0) continue;
                break;
            }
        }
        return streak;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private User resolveUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
    }

    private StudyLogResponse toResponse(StudySession s) {
        return new StudyLogResponse(
            s.getId(),
            s.getSubject().getId(),
            s.getSubject().getName(),
            s.getDurationMinutes(),
            s.getDate(),
            s.getNotes()
        );
    }
}
