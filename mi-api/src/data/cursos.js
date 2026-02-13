let cursos = [
  {
    id: 1,
    nombre: 'Desarrollo Web',
    descripcion: 'Curso completo de desarrollo web full stack',
    duracion: 40,
    nivel: 'intermedio'
  },
  {
    id: 2,
    nombre: 'JavaScript Avanzado',
    descripcion: 'Aprende conceptos avanzados de JavaScript',
    duracion: 30,
    nivel: 'avanzado'
  },
  {
    id: 3,
    nombre: 'Introducción a la Programación',
    descripcion: 'Primeros pasos en el mundo de la programación',
    duracion: 20,
    nivel: 'principiante'
  }
];

let nextId = 4;

export const obtenerTodos = () => {
  return cursos;
};

export const obtenerPorId = (id) => {
  return cursos.find(c => c.id === parseInt(id));
};

export const crear = (datosCurso) => {
  const nuevoCurso = {
    id: nextId++,
    ...datosCurso
  };
  cursos.push(nuevoCurso);
  return nuevoCurso;
};

export const actualizar = (id, datosCurso) => {
  const index = cursos.findIndex(c => c.id === parseInt(id));
  if (index === -1) return null;

  cursos[index] = {
    ...cursos[index],
    ...datosCurso,
    id: parseInt(id)
  };
  return cursos[index];
};

export const eliminar = (id) => {
  const index = cursos.findIndex(c => c.id === parseInt(id));
  if (index === -1) return false;

  cursos.splice(index, 1);
  return true;
};
