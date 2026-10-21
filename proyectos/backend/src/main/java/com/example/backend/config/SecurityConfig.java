package com.example.backend.config;

import jakarta.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtIssuerValidator;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.web.BearerTokenAuthenticationEntryPoint;
import org.springframework.security.oauth2.server.resource.web.access.BearerTokenAccessDeniedHandler;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Configuración de seguridad para la API REST de TecReview.
 *
 * Implementa validación criptográfica de access tokens ES256 emitidos por Supabase Auth,
 * manteniendo una arquitectura sin estado (stateless) y soporte CORS para Authorization.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${supabase.jwt.issuer-uri:https://xjepyqdynspdekuixuoe.supabase.co/auth/v1}")
    private String issuerUri;

    @Value("${supabase.jwt.jwk-set-uri:https://xjepyqdynspdekuixuoe.supabase.co/auth/v1/.well-known/jwks.json}")
    private String jwkSetUri;

    @Value("${supabase.jwt.audience:authenticated}")
    private String expectedAudience;

    @Value("${FRONTEND_URL:http://localhost:3000}")
    private String frontendUrl;

    @PostConstruct
    public void validateConfiguration() {
        if (expectedAudience == null || expectedAudience.isBlank()) {
            throw new IllegalStateException("La propiedad 'supabase.jwt.audience' es obligatoria y no puede estar vacía.");
        }
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, AdminAuthorizationManager adminAuthorizationManager) throws Exception {
        http
            .cors(Customizer.withDefaults())
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint(new BearerTokenAuthenticationEntryPoint())
                .accessDeniedHandler(new BearerTokenAccessDeniedHandler())
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/health").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/productos/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/rankings/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/categorias/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/marcas/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/resenas/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/usuarios/me").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/productos/**", "/api/categorias/**", "/api/marcas/**").access(adminAuthorizationManager)
                .requestMatchers(HttpMethod.PUT, "/api/productos/**", "/api/categorias/**", "/api/marcas/**").access(adminAuthorizationManager)
                .requestMatchers(HttpMethod.DELETE, "/api/productos/**", "/api/categorias/**", "/api/marcas/**").access(adminAuthorizationManager)
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(Customizer.withDefaults())
            );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of(frontendUrl));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }

    @Bean
    @ConditionalOnMissingBean(JwtDecoder.class)
    public JwtDecoder jwtDecoder() {
        if (expectedAudience == null || expectedAudience.isBlank()) {
            throw new IllegalStateException("La propiedad 'supabase.jwt.audience' es obligatoria y no puede estar vacía.");
        }
        NimbusJwtDecoder jwtDecoder = NimbusJwtDecoder.withJwkSetUri(jwkSetUri)
                .jwsAlgorithm(SignatureAlgorithm.ES256)
                .build();
        jwtDecoder.setJwtValidator(createJwtValidator(issuerUri, expectedAudience));
        return jwtDecoder;
    }

    public static OAuth2TokenValidator<Jwt> createJwtValidator(String issuer, String audience) {
        if (audience == null || audience.isBlank()) {
            throw new IllegalArgumentException("La audiencia requerida no puede ser nula ni vacía para la validación de tokens.");
        }
        List<OAuth2TokenValidator<Jwt>> validators = new ArrayList<>();
        validators.add(new JwtTimestampValidator());
        if (issuer != null && !issuer.isBlank()) {
            validators.add(new JwtIssuerValidator(issuer));
        }
        validators.add(new JwtClaimValidator<List<String>>(
            JwtClaimNames.AUD,
            aud -> aud != null && aud.contains(audience)
        ));
        return new DelegatingOAuth2TokenValidator<>(validators);
    }
}

