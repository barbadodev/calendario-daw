# Trabajar en paralelo sin pisarse

Guía para Antonio y Jonás (y para las sesiones de OpenCode de cada uno).
Regla de oro: **main es el verdad compartida; tu taller es tu rama.**

---

## 1. El flujo mínimo (esto es el 90%)

```powershell
cd ~\calendario-daw

# ANTES de tocar nada (siempre, sin excepción)
git fetch origin
git status -sb          # debe decir: "up to date with 'origin/main'"

# CREAR tu rama para la idea que vas a hacer
git switch -c antonio/estilos-tarjetas

# TRABAJAR y guardar en trozos pequeños
git add -A
git commit -m "feat(ui): tarjetas con sombra suave"

# ANTES de mergear: traer lo que haya hecho el otro
git fetch origin
git merge origin/main   # aquí saltan los conflictos, si los hay

# PUBLICAR
npm run build           # que compile ANTES de molestar al otro
git push origin antonio/estilos-tarjetas
```

Y para meterlo en main (desde GitHub, con Pull Request → Review → Merge; o en local):

```powershell
git switch main
git pull
git merge antonio/estilos-tarjetas
git push
```

**Consejo:** rama con prefijo de tu nombre (`antonio/...`, `jonas/...`). Así se ve de quién es cada cosa y no chocáis ni por el nombre.

---

## 2. Para que DOS agentes trabajen a la vez: worktree

Un `worktree` es **una carpeta física distinta** con su propia rama, compartiendo el mismo repo. Dos sesiones no se pisan ningún fichero.

```powershell
# Una sola vez. Crea la carpeta hermana y su rama nueva
cd ~\calendario-daw
git worktree add ..\calendario-daw-2 -b antonio/pruebas-estilo

# Copiar la configuración (NO está en git, a propósito)
Copy-Item .\backend\.env ..\calendario-daw-2\backend\.env
Copy-Item .\frontend\.env ..\calendario-daw-2\frontend\.env

# Cada worktree necesita sus dependencias
cd ..\calendario-daw-2\frontend ; npm install
cd ..\calendario-daw-2\backend  ; npm install
```

Ahí dentro abres la segunda sesión de OpenCode y trabajáis simultáneamente.

Ver y limpiar:

```powershell
git worktree list                 # qué carpetas hay y con qué rama
git worktree remove ..\calendario-daw-2      # cuando termines
git worktree prune                # limpiar registros huérfanos
```

> Los 3 puntos que se olvidan siempre: **no hay `.env`** (hay que copiarlos), **no hay `node_modules`** (`npm install`) y **Render solo despliega `main`** (tu rama no se ve en la web hasta mergear; para verla usa `npm run dev`).

### Tu segundo entorno (ya creado)

```
C:\Users\barba\calendario-daw     rama main              <- sesión principal
C:\Users\barba\calendario-daw-2   rama antonio/paralelo-1 <- segunda sesión
```

Allí dentro, para probar sin esperar a Render:

```powershell
cd ~\calendario-daw-2\backend  ; node server.js   # API -> http://localhost:3001
cd ~\calendario-daw-2\frontend ; npm run dev      # web -> http://localhost:5173
```

> El `frontend/.env` que se copó suele apuntar a la API desplegada en Render, así que
> `npm run dev` funciona sin levantar el backend local. Levántalo solo si vas a probar
> cambios de backend (y entonces pon `VITE_API_URL` en `http://localhost:3001` en ese `.env`).

Cuando esa rama esté buena, se mergea a `main` y Render la despliega sola.
Para abrir otra idea en paralelo, una rama nueva dentro del mismo worktree:
`git switch -c antonio/la-otra-idea`

---

## 3. Repartirse el trabajo para no tener conflictos

Los conflictos salen de tocar los mismos ficheros. Repartid por **zona**:

| Zona | Ficheros típicos | Quién |
|------|------------------|-------|
| Backend / sincronización | `backend/src/*`, `supabase/*` | Uno |
| Estilo y tema | `frontend/src/index.css`, `estilos.css`, `tema.js` | Otro |
| Funcionalidad | componentes `.jsx` concretos | El que la pidó |

**Ficheros de alta colisión** (pocos a la vez, y siempre con merge previo):
`frontend/src/index.css` · `frontend/src/App.jsx` · `frontend/src/estilos.css` · `frontend/src/Ajustes.jsx`

Si los dos tenéis que cambiar `index.css`, hacedlo en **commits separados seguidos**: uno mergea, el otro hace `git pull` antes de empezar.

---

## 4. Cuando salta un conflicto (no pasa nada)

```
CONFLICT (content): Merge conflict in frontend/src/index.css
```

1. `git status` → lista los ficheros manchados
2. Ábrelos y busca `<<<<<<<`, `=======`, `>>>>>>>`
   - lo de arriba es **tu** versión, lo de abajo la **del otro**
3. Deja lo que quieras (normalmente las dos cosas), borra las tres líneas de marcadores
4. `git add <fichero>` y `git commit`

Atajos cuando quieras una de las dos versiones enteras:

```powershell
git checkout --ours   frontend/src/index.css    # me quedo con el mío
git checkout --theirs frontend/src/index.css    # me quedo con el suyo
git merge --abort                                # aún no, salgo del merge
```

Y para no perder nunca el trabajo antes de un merge:

```powershell
git stash          # guarda lo que tienes a medias
git stash pop      # lo recupera
```

---

## 5. Las ideas que van saliendo sobre la marcha

Para que no se pierdan ni os bloqueen:

1. Apuntadlas en `IDEAS.md` con un commit rápido (2 segundos).
2. Cada idea = una rama pequeña.
3. Lo que no se haga hoy, se queda en la lista.

Formato sugerido:

```
- [ ] idea (quién) — nota breve
```

---

## 6. Checklist antes de mergear a main

- [ ] `git fetch && git merge origin/main` sin conflictos pendientes
- [ ] `npm run build` pasa en `frontend/`
- [ ] `node --check` en los ficheros tocados del backend
- [ ] Mensaje de commit que se entiende dentro de 3 meses
- [ ] Render ha desplegado y la web abre

---

## 7. Comandos que se usan todos los días

```powershell
git log --oneline -10          # qué ha pasado
git diff origin/main            # qué tengo yo que él no ve
git switch main                 # volver a la base
git pull                        # traer lo nuevo
git branch -a                   # todas las ramas (incluidas las del otro)
git restore <fichero>           # deshacer cambios de un fichero
git revert <commit>             # deshacer un commit ya publicado (seguro)
```

**Nunca** `git push --force` sobre `main`. Si hace falta es que algo fue mal; mejor `git revert`.
