let usuarios = [
  {
    id: 1,
    nombre: 'Juan Pérez',
    nivel: 'junior'
  },
  {
    id: 2,
    nombre: 'María García',
    nivel: 'senior'
  },
  {
    id: 3,
    nombre: 'Carlos López',
    nivel: 'mid-senior'
  }
];

let nextId = 4;

export const obtenerTodos = () => {
  return usuarios;
};

export const obtenerPorId = (id) => {
  return usuarios.find(u => u.id === parseInt(id));
};

export const crear = (datosUsuario) => {
  const nuevoUsuario = {
    id: nextId++,
    ...datosUsuario
  };
  usuarios.push(nuevoUsuario);
  return nuevoUsuario;
};

export const actualizar = (id, datosUsuario) => {
  const index = usuarios.findIndex(u => u.id === parseInt(id));
  if (index === -1) return null;

  usuarios[index] = {
    ...usuarios[index],
    ...datosUsuario,
    id: parseInt(id)
  };
  return usuarios[index];
};

export const eliminar = (id) => {
  const index = usuarios.findIndex(u => u.id === parseInt(id));
  if (index === -1) return false;

  usuarios.splice(index, 1);
  return true;
};
