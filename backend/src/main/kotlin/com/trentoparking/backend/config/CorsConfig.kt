package com.trentoparking.backend.config

// Questa annotazione dice a Spring che questa classe contiene una configurazione
// dell'applicazione e che deve essere caricata all'avvio
import org.springframework.context.annotation.Configuration

// CorsRegistry serve per registrare le regole CORS sulle rotte HTTP
import org.springframework.web.servlet.config.annotation.CorsRegistry

// WebMvcConfigurer è un'interfaccia che ci permette di personalizzare
// alcune configurazioni del comportamento web di Spring MVC
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer

@Configuration
class CorsConfig : WebMvcConfigurer {

    // Questo metodo viene usato da Spring per aggiungere configurazioni CORS
    // personalizzate alle route del backend
    override fun addCorsMappings(registry: CorsRegistry) {
        // Stiamo dicendo a Spring: applica queste regole CORS a tutti gli endpoint che iniziano con /api/
        registry.addMapping("/api/**")
            // Qui specifichiamo da quali origini il browser può fare richieste.
            // In sviluppo, il frontend React gira su localhost ma con una porta diversa
            // dal backend, quindi dobbiamo autorizzarlo esplicitamente.
            .allowedOrigins(
                "http://localhost:5174",
                "http://localhost:5173"
            )
            // Qui definiamo i metodi HTTP consentiti dal frontend verso il backend
            // POST serve per inviare dati,
            // GET per recuperarli,
            // PUT per aggiornare,
            // DELETE per eliminare,
            // OPTIONS viene usato spesso automaticamente dal browser nelle richieste CORS preliminari.
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")

            // Qui permettiamo tutti gli header.
            // Per ora va bene in fase di sviluppo, perché il frontend invia almeno
            // Content-Type: application/json.
            .allowedHeaders("*")
    }
}