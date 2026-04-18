package com.MiniProject.Students.model;

import jakarta.persistence.*;

@Entity
@Table(name = "subjects",
       uniqueConstraints = @UniqueConstraint(columnNames = {"name", "user_id"}))
public class Subject {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    public Subject() {}

    public Long getId()       { return id; }
    public String getName()   { return name; }
    public void setName(String name) { this.name = name; }
    public User getUser()     { return user; }
    public void setUser(User user)   { this.user = user; }
}
