### For development I used Vue.js v3.5.13 and SCSS for styles

### Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build


### Extra tasks

## Implement bulk delete functionality (select multiple or all tracks and delete them).   DONE!

#if you click on a checkbox to delete a track, a Delete button will appear next to the checkbox, which selects all checkboxes

#Added checkbox for each track
#Added block with "Select all" checkbox and delete button
#Added variable to store the IDs of selected tracks

const selectedTrackIds = ref([]);

#Added computed property

const allTracksSelected = computed(() => {
  return tracks.value.length > 0 && selectedTrackIds.value.length === tracks.value.length;
});

#Added function to select/deselect all tracks

const toggleSelectAll = () => {
  if (allTracksSelected.value) {
    selectedTrackIds.value = [];
  } else {
    selectedTrackIds.value = tracks.value.map(track => track.id);
  }
};

#Added function, which is called when checkboxes are changed

const updateSelectAll = () => {};

#Added function for bulk deletion

const bulkDeleteTracks = async () => {
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
    selectedTrackIds.value = [];
    await fetchTracks();
    await fetchInitialTotalTracks();
  } catch (error) {
    alert('Failed to delete tracks: ' + error.message);
  }
};
