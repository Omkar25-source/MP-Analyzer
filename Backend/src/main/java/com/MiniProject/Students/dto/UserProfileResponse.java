package com.MiniProject.Students.dto;

public class UserProfileResponse {

    private Long   id;
    private String name;
    private String email;
    private String provider;
    private String phone;
    private String semester;
    private String branch;

    public UserProfileResponse(Long id, String name, String email, String provider,
                               String phone, String semester, String branch) {
        this.id       = id;
        this.name     = name;
        this.email    = email;
        this.provider = provider;
        this.phone    = phone;
        this.semester = semester;
        this.branch   = branch;
    }

    public Long   getId()       { return id; }
    public String getName()     { return name; }
    public String getEmail()    { return email; }
    public String getProvider() { return provider; }
    public String getPhone()    { return phone; }
    public String getSemester() { return semester; }
    public String getBranch()   { return branch; }
}
