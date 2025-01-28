# Historial Médico de Melba

Este proyecto es una aplicación web diseñada para visualizar y gestionar el historial médico de Melba, una perra, de manera organizada y accesible.

## Características

- **Visualización cronológica**: Muestra las consultas médicas, tratamientos, vacunas y registros de peso de Melba en orden cronológico.
- **Sistema de filtros avanzado**: 
  - Búsqueda por texto en médicos, keywords y vacunas
  - Filtrado por rango de fechas
  - Filtrado por médico veterinario
  - Filtrado por keywords específicas
- **Interfaz moderna y responsiva**: Diseño adaptable a diferentes dispositivos, asegurando una experiencia de usuario óptima tanto en computadoras de escritorio como en dispositivos móviles.

## Tecnologías Utilizadas

- **HTML5**: Estructura de la aplicación.
- **CSS3**: Estilos y diseño responsivo.
- **JavaScript**: Manejo de la lógica de filtrado y dinámicas de la interfaz.
- **JSON**: Almacenamiento de los datos del historial médico.

## Estructura de Datos

Los registros médicos se almacenan en formato JSON con la siguiente estructura:

```json
{
  "date": "2023-01-24",
  "consulta": "Control rutinario",
  "medico": "Dr. Ejemplo",
  "vacuna": "Antirrábica",
  "peso": "15kg",
  "keywords": ["control", "vacunación"]
}
```

## Instalación y Uso

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/bigote97/hm-melba.git
   cd hm-melba
   ```

2. **Configuración del servidor local**:
   Puedes usar live server o cualquier herramienta que genere un servidor local para visualizar el proyecto.

3. **Acceder a la aplicación**:
   - Abre tu navegador y visita `http://localhost:8000`
   - Utiliza los filtros para buscar registros específicos
   - Visualiza el historial médico completo

## Contribuciones

Las contribuciones son bienvenidas. Si deseas mejorar este proyecto:

1. Haz un fork del repositorio.
2. Crea una nueva rama para tu característica o corrección (`git checkout -b feature/nueva-caracteristica`).
3. Realiza tus cambios y haz commit (`git commit -m 'Descripción de los cambios'`).
4. Sube tus cambios al repositorio (`git push origin feature/nueva-caracteristica`).
5. Abre un Pull Request detallando tus modificaciones.

### Guía de Contribución

- Asegúrate de que tu código sigue los estándares de estilo existentes
- Incluye comentarios cuando sea necesario
- Actualiza la documentación si agregas nuevas características
- Verifica que todos los filtros funcionan correctamente
- Prueba la responsividad en diferentes dispositivos

## Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo LICENSE para más detalles.

## Agradecimientos

- A todos los veterinarios que han cuidado de Melba
- A la comunidad de desarrolladores por las herramientas y librerías utilizadas

---
Desarrollado con ❤️ para mantener saludable a Melba

    