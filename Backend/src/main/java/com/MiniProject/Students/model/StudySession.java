package com.MiniProject.Students.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "study_sessions", indexes = {
    @Index(name = "idx_study_user_date", columnList = "user_id, date")
})
public class StudySession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    @Column(nullable = false)
    private int durationMinutes;

    @Column(nullable = false)
    private LocalDate date;

    private String notes;

    public StudySession() {}

    public Long getId()                        { return id; }

    public User getUser()                      { return user; }
    public void setUser(User user)             { this.user = user; }

    public Subject getSubject()                { return subject; }
    public void setSubject(Subject subject)    { this.subject = subject; }

    public int getDurationMinutes()                      { return durationMinutes; }
    public void setDurationMinutes(int durationMinutes)  { this.durationMinutes = durationMinutes; }

    public LocalDate getDate()                 { return date; }
    public void setDate(LocalDate date)        { this.date = date; }

    public String getNotes()                   { return notes; }
    public void setNotes(String notes)         { this.notes = notes; }
}
