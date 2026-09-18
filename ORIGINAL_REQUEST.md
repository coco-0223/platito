# Original User Request

## Initial Request — 2026-09-17T23:53:35Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: [none — teamwork routes from the description]

Construir la primera versión funcional (MVP) de Platito, un marketplace gastronómico de marca blanca. El emprendedor carga su catálogo y el cliente compra de forma anónima en una vitrina unificada. El dueño de la plataforma se encarga de la logística y entregas personalmente.

Working directory: ~/teamwork_projects/platito
Integrity mode: development

## Requirements

### R1. Stack Tecnológico
Desarrollar la interfaz utilizando Next.js o React. Utilizar Firebase como base de datos y Cloud Storage para el almacenamiento.

### R2. Panel del Proveedor
El proveedor debe poder subir sus platos, establecer su costo base y gestionar su disponibilidad. El sistema debe asegurar que las imágenes pesen máximo 1 MB (comprimiéndolas o validándolas) antes de subirlas a Firebase.

### R3. Vitrina del Cliente (Anónima)
El cliente debe poder navegar por el catálogo bajo la marca "Platito", ver los precios finales (que son el costo base + el margen de la plataforma) y simular la compra de un producto.

## Acceptance Criteria

### Funcionalidad y Seguridad Validada
- [ ] Existen pruebas automáticas que verifican con éxito que un proveedor puede guardar un plato en la base de datos.
- [ ] Existen pruebas automáticas que verifican que un cliente ve el precio final correcto y puede agregarlo al carrito.
- [ ] Se han implementado reglas de seguridad para que los datos estén protegidos (como pidió el usuario).
- [ ] Un agente inspector independiente verifica que la página carga correctamente y es visualmente funcional para que luego el usuario la pueda probar manualmente.

---
*Next: when approved → delegate via invoke_subagent (see Delegation Protocol)*

## Follow-up — 2026-09-18T00:24:59Z

USER INSTRUCTION UPDATE: 
The user has provided additional product direction that you must incorporate into your master project requirements and upcoming UI milestones:
1. Data Model: Follow a "PedidosYa / UberEats" structure for dishes (categories, rich descriptions, high-quality photos) but strictly maintaining the white-label anonymity.
2. Differentiator 1 (Customer UI): Implement a recommendation "feed" (similar to social media or discovery feeds) for customers to discover new, similar, or complementary dishes. This is crucial for undecided buyers.
3. Differentiator 2 (Provider UI): The provider panel shouldn't just be an upload form; it must include integrated software tools to help them manage their business (e.g., basic inventory management, ingredient cost tracking) to add immense value and prevent them from leaving the platform.
