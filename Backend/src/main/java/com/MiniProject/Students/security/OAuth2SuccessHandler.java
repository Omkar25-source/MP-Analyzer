package com.MiniProject.Students.security;

import com.MiniProject.Students.model.User;
import com.MiniProject.Students.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

/**
 * Invoked after a successful Google / GitHub OAuth2 login.
 * Creates or updates the User record, generates a JWT, then redirects
 * to the frontend with the token in the query string.
 *
 * Frontend URL: http://127.0.0.1:5500/Pages/Dashboard/Dashboard.html?token=...
 */
@Component
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserRepository userRepository;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication)
            throws IOException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        // Both Google and GitHub expose "email" attribute
        String email    = oAuth2User.getAttribute("email");
        String name     = oAuth2User.getAttribute("name");

        // Detect provider from the registration id stored in the request
        String provider = request.getRequestURI().contains("github") ? "GITHUB" : "GOOGLE";

        // Upsert user
        Optional<User> existing = userRepository.findByEmail(email);
        User user;
        if (existing.isPresent()) {
            user = existing.get();
            if (user.getName() == null || user.getName().isBlank()) {
                user.setName(name);
            }
        } else {
            user = new User();
            user.setEmail(email);
            user.setName(name);
            user.setProvider(provider);
            // password stays null for OAuth users
        }
        userRepository.save(user);

        String token = jwtUtil.generateToken(email);

        // Redirect to front-end with token; adjust the base URL if needed
        String frontendUrl = "http://127.0.0.1:5500/Pages/Dashboard/Dashboard.html"
                + "?token=" + URLEncoder.encode(token, StandardCharsets.UTF_8)
                + "&name="  + URLEncoder.encode(name  != null ? name : "", StandardCharsets.UTF_8)
                + "&email=" + URLEncoder.encode(email != null ? email : "", StandardCharsets.UTF_8);

        getRedirectStrategy().sendRedirect(request, response, frontendUrl);
    }
}
