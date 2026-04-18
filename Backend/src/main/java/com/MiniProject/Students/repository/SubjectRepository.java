package com.MiniProject.Students.repository;

import com.MiniProject.Students.model.Subject;
import com.MiniProject.Students.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SubjectRepository extends JpaRepository<Subject, Long> {

    List<Subject> findByUser(User user);

    Optional<Subject> findByNameAndUser(String name, User user);
}
