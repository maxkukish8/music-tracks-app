<template>
  <Teleport to="body">
    <div v-if="isOpen" @click="handleOverlayClick" class="modal-overlay" data-testid="track-form">
      <div class="modal-content" @click.stop>
        <button type="button" @click="closeModal" data-testid="cancel-button" class="cancel-button-modal"></button>
        <h2>{{ isEditing ? 'Edit track' : 'Create a new track' }}</h2>
        <form @submit.prevent="submitForm">
          <div class="form-group">
            <label for="title">Track title</label>
            <input
              class="input-global"
              id="title"
              v-model="form.title"
              type="text"
              data-testid="input-title"
              @input="errors.title = ''"
              placeholder="Enter track title"
            />
            <span v-if="errors.title" class="error-message" data-testid="error-title">{{ errors.title }}</span>
          </div>
          <div class="form-group">
            <label for="artist">Artist</label>
            <input
              class="input-global"
              id="artist"
              v-model="form.artist"
              type="text"
              data-testid="input-artist"
              @input="errors.artist = ''"
              placeholder="Enter artist name"
            />
            <span v-if="errors.artist" class="error-message" data-testid="error-artist">{{ errors.artist }}</span>
          </div>
          <div class="form-group">
            <label for="album">Album</label>
            <input
              class="input-global"
              id="album"
              v-model="form.album"
              type="text"
              data-testid="input-album"
              placeholder="Enter album name"
            />
          </div>
          <div class="form-group">
            <label for="cover-image">Link to the cover</label>
            <input
              class="input-global"
              id="cover-image"
              v-model="form.coverImage"
              type="url"
              data-testid="input-cover-image"
              placeholder="https://example.com/image.jpg"
            />
            <span v-if="errors.coverImage" class="error-message" data-testid="error-cover-image">{{ errors.coverImage }}</span>
          </div>
          <div class="form-group">
            <label>Genres</label>
            <div class="genres-container">
              <span
                v-for="genre in form.genres"
                :key="genre.id"
                class="genre-tag"
              >
                {{ genre.name }}
                <button
                  type="button"
                  @click="removeGenre(genre.id)"
                  class="remove-genre"
                >x</button>
              </span>
              <button
                type="button"
                @click="toggleGenreSelector"
                class="add-genre"
              >+</button>
              <div v-if="showGenreSelector" class="select-wrapper">
                <select
                  v-if="showGenreSelector"
                  v-model="selectedGenre"
                  @change="addGenre"
                  class="genre-select input-global"
                  data-testid="genre-selector"
                >
                  <option
                    v-for="genre in availableGenres"
                    :key="genre.id"
                    :value="genre"
                  >
                    {{ genre.name }}
                  </option>
                </select>
                <span v-if="!selectedGenre" class="select-placeholder">Choose genre</span>
              </div>
            </div>
            <span v-if="errors.genres" class="error-message" data-testid="error-genre">{{ errors.genres }}</span>
          </div>
          <div class="form-actions">
            <button type="submit" data-testid="submit-button" class="submit-button">Save</button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';

const emit = defineEmits(['track-created', 'track-updated']);

const isOpen = ref(false);
const isEditing = ref(false); // Add a checkbox for edit mode
const currentTrack = ref(null); // Save the editing track

const form = reactive({
  title: '',
  artist: '',
  album: '',
  coverImage: '',
  genres: [],
});

const errors = reactive({
  title: '',
  artist: '',
  coverImage: '',
  genres: '',
});

const allGenres = ref([]);
const selectedGenre = ref(null);
const showGenreSelector = ref(false);

const availableGenres = computed(() => {
  return allGenres.value.filter(
    (genre) => !form.genres.some((selected) => selected.id === genre.id)
  );
});

const fetchGenres = async () => {
  try {
    const response = await fetch('/api/genres');
    const data = await response.json();
    allGenres.value = data.map((genre, index) => ({
      id: index + 1,
      name: genre,
    }));
  } catch (error) {
    console.error('Error loading genres:', error);
  }
};

// Function to get all tracks
const fetchAllTracks = async () => {
  try {
    const response = await fetch('/api/tracks?page=1&limit=1000');
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error loading tracks:', error);
    return [];
  }
};

const toggleGenreSelector = () => {
  showGenreSelector.value = !showGenreSelector.value;
  if (showGenreSelector.value) {
    selectedGenre.value = null;
  }
};

const addGenre = () => {
  if (selectedGenre.value) {
    form.genres.push(selectedGenre.value);
    selectedGenre.value = null;
    showGenreSelector.value = false;
    errors.genres = '';
  }
};

const removeGenre = (genreId) => {
  form.genres = form.genres.filter((genre) => genre.id !== genreId);
};

const validateForm = () => {
  let isValid = true;
  errors.title = '';
  errors.artist = '';
  errors.coverImage = '';
  errors.genres = '';

  if (!form.title.trim()) {
    errors.title = 'Track name is required';
    isValid = false;
  }

  if (!form.artist.trim()) {
    errors.artist = 'Artist name is required';
    isValid = false;
  }

  if (form.coverImage && !/^https?:\/\/.+\.(jpg|jpeg|png|gif)$/i.test(form.coverImage)) {
    errors.coverImage = 'The link must be to an image (jpg, jpeg, png, gif)';
    isValid = false;
  }

  if (form.genres.length === 0) {
    errors.genres = 'Choose at least one genre';
    isValid = false;
  }

  return isValid;
};

const submitForm = async () => {
  if (!validateForm()) {
    return;
  }

  // Receive all the tracks for verification
  const allTracks = await fetchAllTracks();
  const existingTrack = allTracks.find(
    (track) =>
      track.title.toLowerCase() === form.title.toLowerCase() &&
      (!isEditing.value || track.id !== currentTrack.value?.id)
  );

  if (existingTrack) {
    alert('A track with this title already exists');
    return;
  }

  const payload = {
    title: form.title,
    artist: form.artist,
    album: form.album,
    coverImage: form.coverImage,
    genres: form.genres.map((genre) => genre.id.toString()),
  };

  try {
    const url = isEditing.value ? `/api/tracks/${currentTrack.value.id}` : '/api/tracks';
    const method = isEditing.value ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Error saving track');
    }

    closeModal();
    emit(isEditing.value ? 'track-updated' : 'track-created');
    emit('success-message', 'Your track has been successfully saved.');
  } catch (error) {
    console.error('Error saving track:', error);
    alert('Error saving track: ' + error.message);
  }
};

const openModal = (track = null) => {
  isOpen.value = true;
  if (track) {
    // Edit mode
    isEditing.value = true;
    currentTrack.value = track;
    form.title = track.title;
    form.artist = track.artist;
    form.album = track.album || '';
    form.coverImage = track.coverImage || '';
    // Converting genre IDs into objects
    form.genres = track.genres.map((id) => {
      const genre = allGenres.value.find((g) => g.id === parseInt(id));
      return genre || { id: parseInt(id), name: id.toString() };
    });
  } else {
    // Creation mode
    isEditing.value = false;
    currentTrack.value = null;
    form.title = '';
    form.artist = '';
    form.album = '';
    form.coverImage = '';
    form.genres = [];
  }
};

const closeModal = () => {
  isOpen.value = false;
};

const handleOverlayClick = (event) => {
  if (event.target.classList.contains('modal-overlay')) {
    closeModal();
  }
};

onMounted(fetchGenres);

defineExpose({ openModal, closeModal });
</script>

<style scoped lang="scss">
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #00000030;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(3px);
}

.modal-content {
  position: relative;
  padding: 1rem 1.5rem;
  background: #0f0c13;
  min-width: 400px;
  border-radius: 10px;
  box-shadow: 0 5px 30px 0 rgb(0 0 0 / 10%);
  animation: fadeIn 1s ease both;
  color: #fdfcfe;

  h2 {
    margin-bottom: 10px;
    font-size: 20px;
  }
}

.form-group {
  margin-bottom: 15px;

  label {
    display: block;
    margin-bottom: 5px;
    font-size: 15px;
  }

  .input-global {
    width: 100%;
    height: 28px;
    font-size: 12px;
  }

  .select-wrapper {
    position: relative;
    width: 100%;
    margin-top: 10px;
  }

  .select-placeholder {
    position: absolute;
    top: 50%;
    left: 10px;
    transform: translateY(-50%);
    color: #999;
    pointer-events: none;
    font-size: 14px;
  }

  .genres-container {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 5px;
  }
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;

  .submit-button {
    background: #a039fa;
    color: #fff;
    border: none;
    padding: 5px 25px;
    border-radius: 7px;
    font-weight: 600;
    font-size: 15px;
    cursor: pointer;
    transition: all 0.5s ease;

    &:hover {
      opacity: 0.7;
    }
  }
}

.error-message {
  color: #ff0000;
  font-size: 12px;
  display: block;
  margin-top: 5px;
}

.genre-tag {
  background: #29282d;
  padding: 7px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  height: 28px;
  transition: all .5s ease;

  &:hover {
    background-color: #3a393e;
  }
}

.remove-genre {
  background: none;
  border: none;
  color: #fdfcfe;
  cursor: pointer;
}

.add-genre {
  color: #59585d;
  background-color: #1f1e23;
  font-size: 25px;
  width: 25px;
  height: 25px;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
</style>
