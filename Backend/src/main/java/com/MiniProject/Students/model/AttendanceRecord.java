package com.MiniProject.Students.model;

import jakarta.persistence.*;

@Entity
@Table(name = "attendance_records")
public class AttendanceRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String date;           // YYYY-MM-DD

    @Column(nullable = false)
    private String status;         // PRESENT | ABSENT | LATE

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    public AttendanceRecord() {}

    public Long getId()         { return id; }
    public String getDate()     { return date; }
    public void setDate(String date)         { this.date = date; }
    public String getStatus()   { return status; }
    public void setStatus(String status)     { this.status = status; }
    public User getUser()       { return user; }
    public void setUser(User user)           { this.user = user; }
    public Subject getSubject() { return subject; }
    public void setSubject(Subject subject)  { this.subject = subject; }
}
