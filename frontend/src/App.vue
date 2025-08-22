<template>
  <div :class="['wrapper', { 'without-tracks': showWithoutTracksClass && initialTotalTracks === 0 }]">
    <div v-if="successMessage" class="success-message">
      {{ successMessage }}
    </div>
    <div class="create-track-button-wrapper">
      <div class="gradient-background overlay"></div>
      <img
        :src="mainImage"
        alt="Main Image"
        class="homepod-img"
      />
      <div class="homepod-player">
        <div class="gradient-background main"></div>
      </div>
      <button @click="openCreateModal" data-testid="create-track-button" class="create-track-button">Create Track</button>
    </div>
    <CreateTrackModal
      ref="createTrackModal"
      @track-created="handleTrackCreated"
      @track-updated="handleTrackCreated"
      @success-message="handleSuccessMessage"
    />
    <!-- We show the block with filters and sorting only if there is at least one track -->
    <div v-if="initialTotalTracks > 0" class="filters-and-tracks">
      <h1 data-testid="tracks-header" class="tracks-header">Tracks list</h1>
      <!-- search field -->
      <div class="search-controls">
        <div class="inner">
          <input
            id="searchQuery"
            v-model="searchQuery"
            placeholder="Enter a title, artist, or album"
            @input="debouncedSearch"
            class="search-input input-global"
            data-testid="search-input"
          />
          <!-- Search Clear Button -->
          <button
            v-if="searchQuery"
            @click="clearSearch"
            class="cancel-button-modal"
            title="Clear search"
          ></button>
        </div>
      </div>
      <div class="toolbar">
        <!-- Filters -->
        <div class="filter-controls">
          <div class="filter-group">
            <input
              id="filterArtist"
              v-model="filterArtist"
              placeholder="Enter the artist"
              @input="applyFilters"
              class="filter-input input-global"
              data-testid="filter-artist"
            />
          </div>
          <div class="filter-group">
            <input
              id="filterAlbum"
              v-model="filterAlbum"
              placeholder="Enter the album"
              @input="applyFilters"
              class="filter-input input-global"
            />
          </div>
          <div class="filter-group">
            <select
              id="filterGenre"
              v-model="filterGenre"
              @change="applyFilters"
              class="filter-select input-global"
              data-testid="filter-genre"
            >
              <option value="">All genres</option>
              <option v-for="genre in genres" :key="genre.id" :value="genre.id">
                {{ genre.name }}
              </option>
            </select>
          </div>
          <button
            @click="clearFilters"
            class="clear-filters-button"
            v-if="filterArtist !== '' || filterAlbum !== '' || filterGenre !== ''"
          >
            Clear filters
          </button>
        </div>
        <!-- Sorting -->
        <div class="sorting-controls">
          <label for="sortField">Sort by: </label>
          <select id="sortField" v-model="sortField" @change="sortTracks" class="input-global" ata-testid="sort-select">
            <option value="title">Title</option>
            <option value="artist">Artist</option>
            <option value="album">Album</option>
          </select>
        </div>

      </div>
      <!-- Track list or message -->
      <div v-if="tracks.length" class="track-list">
        <div class="header-track-list">
          <div class="track">Track</div>
          <div class="artist">Artist</div>
          <div class="album">Album</div>
          <div class="genre">Genre</div>
          <div class="action">Action</div>
          <div class="checkbox">
            <!-- "Select All" checkbox and bulk delete button -->
            <div v-if="tracks.length" class="bulk-actions">
              <label class="custom-checkbox">
                <input
                  type="checkbox"
                  :checked="allTracksSelected"
                  @change="toggleSelectAll"
                  data-testid="select-all"
                />
                <span class="checkmark"></span>
              </label>
              <div class="bulk-button-wrapper" v-if="selectedTrackIds.length">
                <button class="open-modal-action open-modal-action-bulk" @click="toggleModalBulk">...</button>
                <div class="inner" v-if="isModalOpenBulk">
                  <div class="modal madsl-bulk">
                    <button
                      @click="bulkDeleteTracks"
                      class="bulk-delete-button"
                      data-testid="bulk-delete-button"
                    >Delete selected tracks ({{ selectedTrackIds.length }})
                    </button>
                    <button @click="closeModalBulk" class="cancel-button-modal"></button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="content-track-list">
          <div
          v-for="track in tracks"
          :key="track.id"
          :data-testid="`track-item-${track.id}`"
          :class="['track-item', { 'with-audio': track.audioFile }]"
          >
            <div class="track">
              <img
                :src="track.coverImage || noImage"
                alt="Track cover"
                class="track-cover"
              />
              <span :data-testid="`track-item-${track.id}-title`">{{ track.title }}</span>
            </div>
            <div class="artist">
              <span :data-testid="`track-item-${track.id}-artist`">{{ track.artist }}</span>
            </div>
            <div class="album">
              {{ track.album || 'No album' }}
            </div>
            <div class="genre">
              {{ getGenreNames(track.genres).join(', ') }}
            </div>
            <div class="action">
              <div class="action-inner">
                <button class="open-modal-action" @click="toggleModal(track.id)">...</button>

                <div v-if="openModalId === track.id" class="modal-backdrop modal-small">
                  <div class="modal">
                    <button @click="closeModal" class="cancel-button-modal"></button>
                    <button
                      @click="editTrack(track)"
                      class="edit-button"
                      :data-testid="`edit-track-${track.id}`"
                      >Edit</button>
                    <button
                      v-if="!track.audioFile"
                      @click="uploadFile(track)"
                      class="upload-button"
                      :data-testid="`upload-track-${track.id}`"
                    >Add audio file</button>
                    <button
                      v-else
                      @click="removeAudioFile(track.id)"
                      class="remove-button"
                    >Delete audio file</button>
                    <div v-if="uploadingTrackId === track.id" class="upload-form">
                      <input
                        type="file"
                        accept="audio/mpeg,audio/wav"
                        @change="handleFileUpload($event, track.id)"
                        class="file-input"
                      />
                      <button @click="uploadingTrackId = null" class="cancel-audio-button">Cancel</button>
                    </div>
                    <button
                      @click="deleteTrack(track.id)"
                      class="delete-button"
                      :data-testid="`delete-track-${track.id}`"
                    >Delete track</button>
                  </div>
                </div>
              </div>
            </div>
            <div class="checkbox">
              <label class="custom-checkbox">
                <input
                  type="checkbox"
                  :value="track.id"
                  v-model="selectedTrackIds"
                  @change="updateSelectAll"
                  :data-testid="`track-checkbox-${track.id}`"
                />
                <span class="checkmark"></span>
              </label>
            </div>
            <div class="audio-wrapper">
              <audio
                v-if="track.audioFile"
                :ref="el => setAudioElement(track.id, el)"
                :src="`/api/files/${track.audioFile}`"
                controls
                class="audio-player"
                @play="handlePlay(track.id)"
                @error="handleAudioError(track.id)"
                :data-testid="`audio-player-${track.id}`"
              ></audio>
            </div>
          </div>
        </div>
      </div>
      <p v-else-if="filtersApplied || searchQuery">There are no tracks matching the search criteria.</p>
      <p v-else>There are no saved tracks.</p>
      <!-- Pagination -->
      <div v-if="totalTracks > tracksPerPage" class="pagination" data-testid="pagination">
        <button
          @click="changePage(currentPage - 1)"
          :disabled="currentPage === 1"
          class="pagination-button"
          data-testid="pagination-prev"
        >Prev</button>
        <span class="pagination-info">
          Page {{ currentPage }} of {{ totalPages }}
        </span>
        <button
          @click="changePage(currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="pagination-button"
          data-testid="pagination-next"
        >Next</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import CreateTrackModal from './components/CreateTrackModal.vue';
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import noImage from './assets/images/noimage.webp';
import mainImage from './assets/images/home-Photoroom.webp';

const createTrackModal = ref(null);
const tracks = ref([]);
const genres = ref([]);
const uploadingTrackId = ref(null);
const audioElements = ref({});
const initialTotalTracks = ref(0); // initial number of tracks
const selectedTrackIds = ref([]); // List of selected tracks for mass release
const successMessage = ref('');
const openModalId = ref(null);
const isModalOpenBulk = ref(false)
const showWithoutTracksClass = ref(false);

//Pagination variables
const currentPage = ref(1);
const tracksPerPage = 10; // Number of tracks per page
const totalTracks = ref(0); // Total tracks
const totalPages = ref(1);

const searchQuery = ref(localStorage.getItem('searchQuery') || '');
watch(searchQuery, () => {
  localStorage.setItem('searchQuery', searchQuery.value);
});

// Filtering options
const filterArtist = ref(localStorage.getItem('filterArtist') || '');
const filterAlbum = ref(localStorage.getItem('filterAlbum') || '');
const filterGenre = ref(localStorage.getItem('filterGenre') || '');

watch([filterArtist, filterAlbum, filterGenre], () => {
  localStorage.setItem('filterArtist', filterArtist.value);
  localStorage.setItem('filterAlbum', filterAlbum.value);
  localStorage.setItem('filterGenre', filterGenre.value);
});

// Load sorting parameters from localStorage or set default values
const sortField = ref(localStorage.getItem('sortField') || 'title');
const sortOrder = ref(localStorage.getItem('sortOrder') || 'asc');

// We save the sorting parameters in localStorage when they change
watch([sortField, sortOrder], () => {
  localStorage.setItem('sortField', sortField.value);
  localStorage.setItem('sortOrder', sortOrder.value);
});

watch(
  () => initialTotalTracks.value,
  (newValue) => {
    // Очищаємо попередній таймер, якщо він існує
    if (window.trackClassTimeout) {
      clearTimeout(window.trackClassTimeout);
    }

    if (newValue === 0) {
      window.trackClassTimeout = setTimeout(() => {
        showWithoutTracksClass.value = true;
      }, 200);
    } else {
      showWithoutTracksClass.value = false;
    }
  },
  { immediate: true }
);

// If filters applied (to display a message if there are no tracks)
const filtersApplied = computed(() => {
  return filterArtist.value || filterAlbum.value || filterGenre.value || searchQuery.value;
});

// if all tracks on the current page selected
const allTracksSelected = computed(() => {
  return tracks.value.length > 0 && selectedTrackIds.value.length === tracks.value.length;
});

// Debounce fubction
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
};

const debouncedSearch = debounce(() => {
  currentPage.value = 1;
  fetchTracks();
}, 500);

// Function for Search clearing
const clearSearch = () => {
  searchQuery.value = '';
  currentPage.value = 1;
  fetchTracks();
};

// Select/deselect all tracks on the current page
const toggleSelectAll = () => {
  if (allTracksSelected.value) {
    selectedTrackIds.value = [];
  } else {
    selectedTrackIds.value = tracks.value.map(track => track.id);
  }
};

// Update the state of the "Select All" checkbox after changing the selection
const updateSelectAll = () => {};

// Mass deletion of selected tracks
const bulkDeleteTracks = async () => {
  if (!confirm(`Are you sure you want to delete ${selectedTrackIds.value.length} tracks?`)) {
    return;
  }

  try {
    for (const trackId of selectedTrackIds.value) {
      const response = await fetch(`/api/tracks/${trackId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error deleting track');
      }
    }

    // Clean the list of selected tracks
    selectedTrackIds.value = [];

    // Updating the track list and initial count
    await fetchTracks();
    await fetchInitialTotalTracks();
  } catch (error) {
    alert('Failed to delete tracks: ' + error.message);
  }
};

const openCreateModal = () => {
  createTrackModal.value.openModal();
};

const editTrack = (track) => {
  createTrackModal.value.openModal(track);
  closeModal();
};

const uploadFile = (track) => {
  uploadingTrackId.value = track.id;
};

// Save the ref to the audio element
const setAudioElement = (trackId, element) => {
  if (element) {
    audioElements.value[trackId] = element;
  } else {
    delete audioElements.value[trackId];
  }
};

// Processing playback: stopping other tracks
const handlePlay = (currentTrackId) => {
  Object.keys(audioElements.value).forEach((trackId) => {
    if (trackId !== currentTrackId) {
      const audio = audioElements.value[trackId];
      audio.pause(); // Stopping other tracks
      audio.currentTime = 0; // Reset progress
    }
  });
};

const handleFileUpload = async (event, trackId) => {
  const file = event.target.files[0];
  if (!file) return;

  // File type check
  const allowedTypes = ['audio/mpeg', 'audio/wav'];
  if (!allowedTypes.includes(file.type)) {
    alert('Only MP3 and WAV files are allowed.');
    return;
  }

  // File size check (maximum 10 MB)
  const maxSize = 10 * 1024 * 1024; // 10 МB
  if (file.size > maxSize) {
    alert('The file is too large. Maximum size is 10 MB.');
    return;
  }

  // Sending a file via API
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`/api/tracks/${trackId}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error while uploading file');
    }

    uploadingTrackId.value = null;
    await fetchTracks();
  } catch (error) {
    alert('Failed to download file.: ' + error.message);
  }
  closeModal();
};

const removeAudioFile = async (trackId) => {
  try {
    const response = await fetch(`/api/tracks/${trackId}/file`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error deleting audio file');
    }

    await fetchTracks();
  } catch (error) {
    alert('Failed to delete audio file: ' + error.message);
  }
  closeModal();
};

const deleteTrack = async (trackId) => {
  if (!confirm('Are you sure you want to delete this track?')) {
    return;
  }

  try {
    const response = await fetch(`/api/tracks/${trackId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error deleting track');
    }

    // Remove a track from the favorites list if it was selected
    selectedTrackIds.value = selectedTrackIds.value.filter(id => id !== trackId);

    // Updating the track list
    await fetchTracks();
    await fetchInitialTotalTracks();
  } catch (error) {
    alert('Failed to delete track: ' + error.message);
  }
  closeModal();
};

const handleAudioError = (trackId) => {
  console.warn(`Error playing file for track ${trackId}`);
  alert('Failed to play file from server.');
};

const fetchGenres = async () => {
  try {
    const response = await fetch('/api/genres');
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    const data = await response.json();
    genres.value = data.map((name, index) => ({
      id: index + 1,
      name,
    }));
  } catch  {
    genres.value = [];
  }
};

// Function to get the initial number of tracks (without filters)
const fetchInitialTotalTracks = async () => {
  try {
    const response = await fetch(`/api/tracks?page=1&limit=1`);
    const data = await response.json();
    initialTotalTracks.value = data.meta?.total || 0;
  } catch {
    initialTotalTracks.value = 0;
  }
};

//The function performs the request to the API to retrieve a paginated list of tracks, updates reactive variables
const fetchTracks = async () => {
  try {
    // Parameters for filters
    const artistParam = filterArtist.value ? `&artist=${encodeURIComponent(filterArtist.value)}` : '';
    const searchParam = (filterAlbum.value || searchQuery.value) ? `&search=${encodeURIComponent(filterAlbum.value || searchQuery.value)}` : '';
    const genreParam = filterGenre.value ? `&genre=${encodeURIComponent(filterGenre.value)}` : '';
    const response = await fetch(`/api/tracks?page=${currentPage.value}&limit=${tracksPerPage}&sort=${sortField.value}&order=${sortOrder.value}${artistParam}${searchParam}${genreParam}`);
    const data = await response.json();

    tracks.value = data.data || [];
    totalTracks.value = data.meta?.total || 0;
    totalPages.value = data.meta?.totalPages || 1;

    // Clear selected tracks if they are no longer in the list
    selectedTrackIds.value = selectedTrackIds.value.filter(id =>
      tracks.value.some(track => track.id === id)
    );

    // Update the initial track count if it is not already set
    if (initialTotalTracks.value === 0 && !filtersApplied.value) {
      initialTotalTracks.value = data.meta?.total || 0;
    }
  } catch {
    tracks.value = [];
    totalTracks.value = 0;
    totalPages.value = 1;
    initialTotalTracks.value = 0;
  }
};

//Function for Page change
const changePage = (newPage) => {
  if (newPage >= 1 && newPage <= totalPages.value) {
    currentPage.value = newPage;
    fetchTracks();
  }
};

const getGenreNames = (genreIds) => {
  return genreIds.map((id) => {
    const genre = genres.value.find((g) => g.id === parseInt(id));
    return genre ? genre.name : id;
  });
};

// Function to update sorting
const sortTracks = () => {
  currentPage.value = 1; // Reset to the first page when sorting changes
  fetchTracks();
};

const applyFilters = () => {
  currentPage.value = 1;
  fetchTracks();
};

const clearFilters = () => {
  filterArtist.value = '';
  filterAlbum.value = '';
  filterGenre.value = '';
  applyFilters();
};

const handleTrackCreated = async () => {
  currentPage.value = 1; // Reset to the first page after creation/update
  await fetchTracks();
};

// Success message banner
const handleSuccessMessage = (message) => {
  successMessage.value = message;
  setTimeout(() => {
    successMessage.value = '';
  }, 3000);
};

const toggleModal = (trackId) => {
  if (openModalId.value === trackId) {
    closeModal();
  } else {
    openModalId.value = trackId;
  }
};

const closeModal = () => {
  openModalId.value = null;
};

function toggleModalBulk() {
  isModalOpenBulk.value = !isModalOpenBulk.value
}

function closeModalBulk() {
  isModalOpenBulk.value = false
}

// Function to handle click outside modal window
const handleDocumentClick = (event) => {
  const modalContent = event.target.closest('.modal');
  const openModalButton = event.target.closest('.open-modal-action');
  if (openModalButton) return;
  if (modalContent) return;
  if (openModalId.value) {
    closeModal();
  }
  if (isModalOpenBulk.value) {
    closeModalBulk();
  }
};

onMounted(async () => {
  await fetchGenres();
  await fetchInitialTotalTracks();
  await fetchTracks();

  // Update the initial track count after creating a new track
  await fetchInitialTotalTracks();
  document.addEventListener('click', handleDocumentClick);
});

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick);
});

</script>

<style scoped lang="scss">
.wrapper {
  display: grid;
  place-items: center;
  box-sizing: border-box;
  margin-left: auto;
  margin-right: auto;
  max-width: 1200px;
  padding-left: 20px;
  padding-right: 20px;
  width: auto;

  .create-track-button-wrapper {
    display: flex;
    width: 100%;
    margin: 50px 0 0;
  }

  .create-track-button {
    background: #a039fa;
    color: #fff;
    border: none;
    padding: 5px 25px;
    border-radius: 7px;
    font-weight: 600;
    font-size: 15px;
    cursor: pointer;
    transition: all .5s ease;

    &:hover {
      opacity: 0.7;
    }
  }

  .gradient-background, .homepod-img, .homepod-player {
    display: none;
  }

  &.without-tracks {
    background-color: #202020;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    width: 100%;
    height: 100vh;
    padding: 0.5rem;

    .create-track-button-wrapper {
      position: relative;
      margin: 0;
      width: auto;

      .create-track-button {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        padding: 50px 20px;
        border-radius: 100%;
      }
    }

    .gradient-background {
      background: linear-gradient(49deg, #2b3d47, #a81a0c, #3233af, #ce7209);
      background-size: 240% 240%;
      -webkit-animation: gradient-animation 4s ease infinite;
      animation: gradient-animation 4s ease infinite;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      border: 4px solid rgba(32, 22, 22, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 30px;

      &.overlay {
        position: absolute;
        top: 0;
        filter: blur(100px);
      }
    }

    .homepod-img {
      display: block;
      max-width: 38rem;
      max-height: 38rem;
      width: 100%;
      filter: brightness(0.4) drop-shadow(0 0 12px rgba(255, 255, 255, 0.15));
    }

    .homepod-player {
      display: block;
      position: absolute;
      background-color: black;
      width: 62%;
      height: 62%;
      top: 50%;
      right: 50%;
      transform: translate(50%, -50%);
      border-radius: 50%;

      .gradient-background {
        background: linear-gradient(49deg, #2b3d47, #a81a0c, #3233af, #ce7209);
        background-size: 240% 240%;
        -webkit-animation: gradient-animation 4s ease infinite;
        animation: gradient-animation 4s ease infinite;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: 4px solid rgba(32, 22, 22, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 30px;
      }
    }
  }
}

.tracks-header {
  margin-bottom: 20px;
}

.track-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 14px;

  .header-track-list,
  .track-item {
    display: grid;
    grid-template-columns: 2fr 2fr 2fr 0.6fr 0.5fr .3fr;
    gap: 8px;
    align-items: center;
  }

  .header-track-list {
    padding: 8px;
    border-bottom: 1px solid rgba(253, 252, 254, 0.3);
  }

  .content-track-list {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .genre {
      white-space: break-spaces;
    }
  }

  .audio-wrapper {
    grid-column: 1 / -1;
    margin-top: 4px;

    audio {
      height: 40px;
    }
  }

  .action, .checkbox, .genre {
    text-align: center;
  }
}

.track-item {
  transition: all .5s ease;
  padding: 10px 8px 0px;

  &:hover {
    background: #3a393e;
    border-radius: 10px;
  }

  &.with-audio {
    padding: 10px 8px;
  }

  .track {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .action {
    .action-inner {
      position: relative;
      display: inline-block;

      .open-modal-action {
        &:hover {
          background: #202020;
        }
      }
    }
  }
}

.modal-small {
  position: absolute;
  top: 50%;
  right: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  transform: translateY(-50%);
  min-width: 150px;

  .modal {
    background: #1b181f;
    padding: 12px;
    border-radius: 10px;
    position: relative;

    .cancel-button-modal {
      top: 12px;
      right: 8px;
    }

    button {
      background: none;
      border: none;
      cursor: pointer;
      display: block;
      color: #fdfcfe;
      font-size: 14px;

      &:hover {
        text-decoration: underline;
      }
    }

    .upload-form {
      .file-input {
        margin-left: 6px;
        font-size: 12px;
        width: 170px;
      }
    }
  }
}

.open-modal-action {
  background: none;
  border: none;
  color: #fdfcfe;
  padding: 10px 8px 20px;
  line-height: 0;
  cursor: pointer;
  transition: all .5s ease;

  &:hover {
    background: #3a393e;
    border-radius: 50px;
  }
}

.track-cover {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: 5px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-top: 1px solid rgba(253,252,254,.3);
  padding-top: 20px;

  .pagination-button {
    padding: 3px 10px;
    background: #a039fa;
    color: #fdfcfe;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 12px;
    transition: all .5s ease;

    &:hover:not(:disabled) {
      opacity: 0.7;
    }

    &:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
  }

  .pagination-info {
    color: #fdfcfe;
    font-size: 12px;
  }
}

.search-controls {
  display: flex;
  justify-content: end;
  margin-bottom: 20px;

  .inner {
    position: relative;
    &:after {
      content: '';
      position: absolute;
      background-size: contain;
      background-repeat: no-repeat;
      background-image: url('@/assets/images/icon-search.svg');
      top: 50%;
      transform: translateY(-50%);
      left: 9px;
      height: 17px;
      width: 17px;
    }
  }

  .search-input {
    width: 300px;
    padding: 5px 30px;
    font-size: 14px;
  }

  .cancel-button-modal {
    top: 50%;
    transform: translateY(-50%);
    right: 10px;
  }
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  font-size: 14px;

  .input-global {
    height: 35px;
  }
}

.sorting-controls {
  label {
    margin-right: 5px;
  }
}

.filters-and-tracks {
  padding: 50px 0;
  width: 100%;
}
.filter-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.clear-filters-button {
  background: #a039fa;
  color: #fff;
  border: none;
  padding: 7px 10px;
  border-radius: 7px;
  font-weight: 600;
  font-size: 12px;
  cursor: pointer;
  transition: all .5s ease;

  &:hover {
    opacity: 0.7;
  }
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 5px;
}

.custom-checkbox {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
  position: relative;

  input {
    display: none;
  }

  .checkmark {
    width: 15px;
    height: 15px;
    border: 1px solid rgba(253,252,254,.3);
    border-radius: 3px;
    background-color: #202020;
    box-sizing: border-box;
    transition: background-color 0.2s, border-color 0.2s;
  }

  input:checked + .checkmark {
    background-color: #a039fa;
    border-color: #a039fa;
    position: relative;
  }

  input:checked + .checkmark::after {
    content: '';
    position: absolute;
    left: 4px;
    top: 0px;
    width: 5px;
    height: 9px;
    border: solid #fff;
    border-width: 0 1px 1px 0;
    transform: rotate(45deg);
  }
}

.bulk-actions {
  position: relative;

  .bulk-button-wrapper {
    position: absolute;
    top: -6px;
    right: 33px;
  }

  .inner {
    position: relative;

    .modal {
      position: absolute;
      top: -36px;
      right: 35px;
      background: #1b181f;
      padding: 11px 22px 12px 12px;
      border-radius: 10px;

      .bulk-delete-button {
        white-space: nowrap;
        border: none;
        background: none;
        color: #fdfcfe;
        cursor: pointer;
        font-size: 14px;
        padding: 0;

        &:hover {
          text-decoration: underline;
        }
      }

      .cancel-button-modal {
        top: 8px;
        right: 3px;

        &:before, &:after {
          height: 10px;
          width: 10px;
          right: 0px;
        }

        &:before {
          right: 6px;
        }
      }
    }
  }
}
</style>
