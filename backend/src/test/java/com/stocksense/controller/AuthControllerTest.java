package com.stocksense.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stocksense.dto.auth.LoginRequest;
import com.stocksense.dto.auth.SignupRequest;
import com.stocksense.entity.Role;
import com.stocksense.entity.User;
import com.stocksense.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
    }

    @Nested
    @DisplayName("Signup Endpoint")
    class SignupEndpoint {

        @Test
        @DisplayName("POST /api/v1/auth/signup — valid signup returns 201")
        void validSignupReturns201() throws Exception {
            SignupRequest request = SignupRequest.builder()
                    .name("John Doe")
                    .email("john@example.com")
                    .password("StrongPassword123")
                    .build();

            mockMvc.perform(post("/api/v1/auth/signup")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.name").value("John Doe"))
                    .andExpect(jsonPath("$.data.email").value("john@example.com"))
                    .andExpect(jsonPath("$.data.role").value("STAFF"));
        }

        @Test
        @DisplayName("POST /api/v1/auth/signup — invalid email returns 400")
        void invalidEmailReturns400() throws Exception {
            SignupRequest request = SignupRequest.builder()
                    .name("John")
                    .email("not-an-email")
                    .password("StrongPassword123")
                    .build();

            mockMvc.perform(post("/api/v1/auth/signup")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        }

        @Test
        @DisplayName("POST /api/v1/auth/signup — short password returns 400")
        void shortPasswordReturns400() throws Exception {
            SignupRequest request = SignupRequest.builder()
                    .name("John")
                    .email("john@example.com")
                    .password("short")
                    .build();

            mockMvc.perform(post("/api/v1/auth/signup")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.errors.password").exists());
        }

        @Test
        @DisplayName("POST /api/v1/auth/signup — duplicate email returns 409")
        void duplicateEmailReturns409() throws Exception {
            // Create user first
            userRepository.save(User.builder()
                    .name("Existing")
                    .email("exists@example.com")
                    .passwordHash(passwordEncoder.encode("Password123"))
                    .role(Role.STAFF)
                    .active(true)
                    .build());

            SignupRequest request = SignupRequest.builder()
                    .name("Duplicate")
                    .email("exists@example.com")
                    .password("Password123")
                    .build();

            mockMvc.perform(post("/api/v1/auth/signup")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.code").value("DUPLICATE_EMAIL"));
        }
    }

    @Nested
    @DisplayName("Login Endpoint")
    class LoginEndpoint {

        @BeforeEach
        void createUser() {
            userRepository.save(User.builder()
                    .name("Login User")
                    .email("login@example.com")
                    .passwordHash(passwordEncoder.encode("CorrectPass123"))
                    .role(Role.STAFF)
                    .active(true)
                    .build());
        }

        @Test
        @DisplayName("POST /api/v1/auth/login — valid login returns tokens")
        void validLoginReturnsTokens() throws Exception {
            LoginRequest request = LoginRequest.builder()
                    .email("login@example.com")
                    .password("CorrectPass123")
                    .build();

            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                    .andExpect(jsonPath("$.data.refreshToken").isNotEmpty())
                    .andExpect(jsonPath("$.data.tokenType").value("Bearer"))
                    .andExpect(jsonPath("$.data.expiresIn").isNumber())
                    .andExpect(jsonPath("$.data.user.email").value("login@example.com"));
        }

        @Test
        @DisplayName("POST /api/v1/auth/login — wrong password returns 401")
        void wrongPasswordReturns401() throws Exception {
            LoginRequest request = LoginRequest.builder()
                    .email("login@example.com")
                    .password("WrongPassword")
                    .build();

            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.success").value(false));
        }
    }

    @Nested
    @DisplayName("Security Tests")
    class SecurityTests {

        @Test
        @DisplayName("Protected endpoint without JWT returns 401")
        void protectedEndpointWithoutJwtReturns401() throws Exception {
            mockMvc.perform(get("/api/v1/products"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("STAFF cannot access MANAGER-only endpoint")
        void staffCannotAccessManagerEndpoint() throws Exception {
            // Sign up as STAFF and get token
            SignupRequest signup = SignupRequest.builder()
                    .name("Staff User")
                    .email("staffonly@example.com")
                    .password("Password123")
                    .build();

            mockMvc.perform(post("/api/v1/auth/signup")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(signup)));

            LoginRequest login = LoginRequest.builder()
                    .email("staffonly@example.com")
                    .password("Password123")
                    .build();

            MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(login)))
                    .andReturn();

            String accessToken = objectMapper.readTree(loginResult.getResponse().getContentAsString())
                    .path("data").path("accessToken").asText();

            // Try to hit a manager-only endpoint: POST /api/v1/products should return 403 FORBIDDEN for STAFF
            mockMvc.perform(post("/api/v1/products")
                            .header("Authorization", "Bearer " + accessToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"name\":\"Unauthorized Item\",\"sku\":\"UNAUTH-01\",\"categoryId\":1,\"unitOfMeasure\":\"pcs\"}"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("MANAGER can authenticate successfully")
        void managerCanAuthenticate() throws Exception {
            userRepository.save(User.builder()
                    .name("Manager")
                    .email("manager@test.com")
                    .passwordHash(passwordEncoder.encode("ManagerPass123"))
                    .role(Role.MANAGER)
                    .active(true)
                    .build());

            LoginRequest login = LoginRequest.builder()
                    .email("manager@test.com")
                    .password("ManagerPass123")
                    .build();

            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(login)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.user.role").value("MANAGER"));
        }
    }
}
