package com.MiniProject.Students.model;

import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Column(unique = true, nullable = false)
    private String email;

    // Password nullable for OAuth users
    private String password;

    // Auth provider: LOCAL, GOOGLE, GITHUB
    @Column(nullable = false)
    private String provider = "LOCAL";

    // Extended profile fields
    private String phone;
    private String semester;
    private String branch;

    // Default constructor (required by JPA)
    public User() {}

    public User(String email, String password) {
        this.email    = email;
        this.password = password;
    }

    // ── Getters & Setters ────────────────────────────────────────

    public Long getId()               { return id; }

    public String getName()           { return name; }
    public void setName(String name)  { this.name = name; }

    public String getEmail()              { return email; }
    public void setEmail(String email)    { this.email = email; }

    public String getPassword()               { return password; }
    public void setPassword(String password)  { this.password = password; }

    public String getProvider()               { return provider; }
    public void setProvider(String provider)  { this.provider = provider; }

    public String getPhone()                  { return phone; }
    public void setPhone(String phone)        { this.phone = phone; }

    public String getSemester()               { return semester; }
    public void setSemester(String semester)  { this.semester = semester; }

    public String getBranch()                 { return branch; }
    public void setBranch(String branch)      { this.branch = branch; }
}
