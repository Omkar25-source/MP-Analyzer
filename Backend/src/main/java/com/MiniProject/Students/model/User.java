package com.MiniProject.Students.model;

import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {

    // Primary Key
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Email must be unique & not null
    @Column(unique = true, nullable = false)
    private String email;

    // Password must not be null
    @Column(nullable = false)
    private String password;

    // Default constructor (required)
    public User() {}

    // Constructor with fields
    public User(String email, String password) {
        this.email = email;
        this.password = password;
    }

    // Getter for ID
    public Long getId() {
        return id;
    }

    // Getter & Setter for Email
    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    // Getter & Setter for Password
    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
