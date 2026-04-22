package com.MiniProject.Students.repository;

import com.MiniProject.Students.model.StudySession;
import com.MiniProject.Students.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface StudySessionRepository extends JpaRepository<StudySession, Long> {

    // All sessions for a user within a date range (uses composite index)
    List<StudySession> findByUserAndDateBetweenOrderByDateDesc(
            User user, LocalDate from, LocalDate to);

    // Today's sessions for a user
    List<StudySession> findByUserAndDate(User user, LocalDate date);

    // Subject-wise minute totals for a date range — avoids loading entities
    @Query("""
        SELECT s.subject.name, COALESCE(SUM(s.durationMinutes), 0)
        FROM StudySession s
        WHERE s.user = :user AND s.date BETWEEN :from AND :to
        GROUP BY s.subject.name
        ORDER BY SUM(s.durationMinutes) DESC
        """)
    List<Object[]> sumMinutesBySubject(
            @Param("user") User user,
            @Param("from") LocalDate from,
            @Param("to")   LocalDate to);

    // Total minutes for a user in a date range — single aggregate
    @Query("""
        SELECT COALESCE(SUM(s.durationMinutes), 0)
        FROM StudySession s
        WHERE s.user = :user AND s.date BETWEEN :from AND :to
        """)
    int sumMinutesInRange(
            @Param("user") User user,
            @Param("from") LocalDate from,
            @Param("to")   LocalDate to);

    // Distinct studied dates for streak calculation (only last 90 days needed)
    @Query("""
        SELECT DISTINCT s.date FROM StudySession s
        WHERE s.user = :user AND s.date >= :since
        ORDER BY s.date DESC
        """)
    List<LocalDate> findStudiedDatesSince(
            @Param("user")  User user,
            @Param("since") LocalDate since);
}
