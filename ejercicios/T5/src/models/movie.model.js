import mongoose from 'mongoose';

const CURRENT_YEAR = new Date().getFullYear();

const GENRES = ['action', 'comedy', 'drama', 'horror', 'scifi'];

const movieSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'El título es requerido'],
      trim: true,
      minlength: [2, 'Mínimo 2 caracteres']
    },
    director: {
      type: String,
      required: [true, 'El director es requerido'],
      trim: true
    },
    year: {
      type: Number,
      required: [true, 'El año es requerido'],
      min: [1888, 'El año mínimo es 1888'],
      max: [CURRENT_YEAR, `El año máximo es ${CURRENT_YEAR}`]
    },
    genre: {
      type: String,
      required: [true, 'El género es requerido'],
      enum: {
        values: GENRES,
        message: `{VALUE} no es un género válido. Usa: ${GENRES.join(', ')}`
      }
    },
    copies: {
      type: Number,
      default: 5,
      min: [1, 'Debe haber al menos 1 copia']
    },
    availableCopies: {
      type: Number,
      min: [0, 'Las copias disponibles no pueden ser negativas']
    },
    timesRented: {
      type: Number,
      default: 0,
      min: [0, 'El contador de alquileres no puede ser negativo']
    },
    cover: {
      type: String,
      default: null
    },
    // Promedio de valoraciones (BONUS)
    rating: {
      type: Number,
      default: null
    },
    // Campos internos de cálculo — no se exponen en respuestas
    ratingCount: {
      type: Number,
      default: 0,
      select: false
    },
    ratingSum: {
      type: Number,
      default: 0,
      select: false
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Al crear, availableCopies = copies si no se especifica explícitamente
movieSchema.pre('save', function (next) {
  if (this.isNew && (this.availableCopies === undefined || this.availableCopies === null)) {
    this.availableCopies = this.copies;
  }
  next();
});

movieSchema.index({ genre: 1 });
movieSchema.index({ timesRented: -1 });

const Movie = mongoose.model('Movie', movieSchema);

export default Movie;
