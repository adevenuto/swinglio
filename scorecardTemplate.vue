<template>
  <div class="relative">
    <!-- Left gradient indicator -->
    <div
      class="absolute top-0 bottom-0 z-20 w-3 transition-opacity duration-300 pointer-events-none"
      :class="{
        'opacity-0': !showLeftGradient,
        'opacity-100': showLeftGradient,
      }"
      :style="{
        left: stickyColumnWidth + 'px',
        background:
          'linear-gradient(to right, rgba(153,153,153,0.2), transparent)',
      }"
    ></div>

    <!-- Right gradient indicator -->
    <div
      class="absolute top-0 bottom-0 right-0 z-20 w-3 transition-opacity duration-300 pointer-events-none"
      :class="{
        'opacity-0': !showRightGradient,
        'opacity-100': showRightGradient,
      }"
      style="
        background: linear-gradient(
          to left,
          rgba(153, 153, 153, 0.35),
          transparent
        );
      "
    ></div>

    <!-- Scorecard -->
    <div class="flex overflow-hidden bg-white">
      <!-- Fixed Width Column -->
      <div class="w-20" ref="fixedColumn">
        <!-- Hole_count/row -->
        <div class="flex items-center card-cell">Hole</div>
        <!-- Teeboxes/rows -->
        <div
          v-for="(teebox, i) in scorecardTeeboxes"
          :key="teebox.name"
          class="flex items-center card-cell"
          :style="{
            backgroundColor: teebox.color,
            color: textColor(teebox.color),
          }"
        >
          {{ teebox.name }}
        </div>
        <!-- Par -->
        <div class="flex items-center card-cell bg-gray-50">Par</div>
        <!-- Players -->
        <div
          v-for="player in players"
          :key="player.id"
          class="flex items-center card-cell"
        >
          {{ player.first_name }}
        </div>
      </div>

      <!-- Flexible Column with Horizontal Scroll -->
      <div
        class="flex-1 overflow-x-auto bg-gray-50"
        ref="scrollContainer"
        @scroll="handleScroll"
      >
        <!-- Hole_count/row -->
        <div ref="cardHoles" class="inline-flex min-w-max">
          <div
            v-for="cell in scorecardHoleCount"
            :key="cell.key"
            class="flex items-center justify-center bg-white card-cell"
            :class="cell.key"
          >
            {{ cell.label }}
          </div>
        </div>
        <!-- Teeboxes/rows -->
        <template v-for="teebox in scorecardTeeboxes" :key="teebox.name">
          <div class="inline-flex min-w-max">
            <template v-for="hole in teebox.holes" :key="hole.number">
              <div
                class="flex items-center justify-center bg-white card-cell"
                :style="{
                  backgroundColor: teebox.color,
                  color: textColor(teebox.color),
                }"
              >
                {{ hole.length }}
              </div>
              <div
                v-if="hole.number === 9 || hole.number === 18"
                class="flex items-center justify-center bg-white card-cell"
              ></div>
            </template>
          </div>
        </template>
        <!-- Par -->
        <div class="inline-flex min-w-max">
          <template
            v-for="hole in scorecardTeeboxes[0].holes"
            :key="hole.number"
          >
            <div class="flex items-center justify-center bg-gray-50 card-cell">
              {{ hole.par }}
            </div>
            <div
              v-if="hole.number === 9 || hole.number === 18"
              class="flex items-center justify-center bg-gray-50 card-cell"
            ></div>
          </template>
        </div>
        <!-- Players -->
        <template v-for="player in players" :key="player.id">
          <div
            :class="`player-${player.id}`"
            class="inline-flex min-w-max player-score"
          >
            <template v-for="cell in getPlayerScoreRow" :key="cell.key">
              <div
                :class="`score-${cell.key}`"
                class="flex items-center justify-center leading-none bg-white card-cell"
              >
                <!-- prevents div from collapsing and rendering inconsistently -->
                {{ cell.value || "&nbsp;" }}
              </div>
            </template>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useColorContrast } from "@/composables/useColorContrast";
import { computed, onMounted, onUnmounted, ref } from "vue";

const scrollContainer = ref(null);
const showLeftGradient = ref(false);
const showRightGradient = ref(true);
const fixedColumn = ref(null);
const stickyColumnWidth = ref(80);

const { getContrastColor } = useColorContrast();

const props = defineProps({
  course: {
    type: Object,
    required: true,
  },
  round: {
    type: Object,
    required: true,
  },
  players: {
    type: [Array, null],
    required: true,
  },
});

// Computed properties
//////////////////////
const scorecardHoleCount = computed(() => {
  const holeCount = props.course.layout_data.hole_count;
  const cells = [];

  const frontNine = Math.min(9, holeCount);

  // Front holes
  for (let i = 1; i <= frontNine; i++) {
    cells.push({ key: `hole-${i}`, label: i });
  }

  // OUT only if 18 holes
  if (holeCount === 18) {
    cells.push({ key: "out", label: "OUT" });
  }

  // Back holes
  if (holeCount > 9) {
    for (let i = 10; i <= holeCount; i++) {
      cells.push({ key: `hole-${i}`, label: i });
    }
  }

  // IN always exists
  cells.push({ key: "in", label: "IN" });

  return cells;
});

const scorecardTeeboxes = computed(() => {
  const teeboxes = props.course.layout_data.teeboxes;

  if (!teeboxes || !Array.isArray(teeboxes)) return [];

  return teeboxes.map((teebox, index) => {
    const holesArray = [];

    // Convert holes object to array
    if (teebox.holes) {
      Object.entries(teebox.holes).forEach(([key, data]) => {
        const holeNumber = parseInt(key.replace("hole-", ""), 10);
        holesArray.push({
          number: holeNumber,
          par: data.par,
          length: data.length,
        });
      });
    }

    // Sort by hole number
    holesArray.sort((a, b) => a.number - b.number);

    return {
      name: teebox.name,
      color: getTeeboxColor(teebox.color),
      holes: holesArray,
    };
  });
});

const getPlayerScoreRow = computed(() => {
  const holeCount = props.course.layout_data.hole_count;
  const cells = [];

  const frontNine = Math.min(9, holeCount);

  // Front holes (1-9)
  for (let i = 1; i <= frontNine; i++) {
    cells.push({ key: `hole-${i}`, value: "" });
  }

  // OUT (only if 18 holes)
  if (holeCount === 18) {
    cells.push({ key: "out", value: "" });
  }

  // Back holes (10-18)
  if (holeCount > 9) {
    for (let i = 10; i <= holeCount; i++) {
      cells.push({ key: `hole-${i}`, value: "" });
    }
  }

  // IN
  cells.push({ key: "in", value: "" });

  return cells;
});

// Methods
//////////////////////
const getTeeboxColor = (color) => {
  return color || "#677079"; // fallback if no color
};

const updateStickyColumnWidth = () => {
  if (fixedColumn.value) {
    stickyColumnWidth.value = fixedColumn.value.offsetWidth;
  }
};

const handleScroll = () => {
  if (!scrollContainer.value) return;

  const { scrollLeft, scrollWidth, clientWidth } = scrollContainer.value;

  showLeftGradient.value = scrollLeft > 10;
  showRightGradient.value = scrollLeft < scrollWidth - clientWidth - 10;
};

const textColor = (colorValue) => {
  return getContrastColor(colorValue);
};

const scrollToHole = (holeNumber) => {
  if (!scrollContainer.value) return;

  const holeElement = scrollContainer.value.querySelector(
    `.hole-${holeNumber}`,
  );
  if (!holeElement) return;

  const containerRect = scrollContainer.value.getBoundingClientRect();
  const holeRect = holeElement.getBoundingClientRect();

  const scrollLeft =
    scrollContainer.value.scrollLeft + (holeRect.left - containerRect.left);

  scrollContainer.value.scrollTo({
    left: scrollLeft,
    behavior: "smooth",
  });
};

// expose
/////////
defineExpose({
  scrollToHole,
});

// Lifecycle
//////////////////////
onMounted(() => {
  handleScroll();
  updateStickyColumnWidth();

  setTimeout(() => {
    scrollToHole(6);
  }, 1000);

  window.addEventListener("resize", () => {
    updateStickyColumnWidth();
    handleScroll();
  });
});

onUnmounted(() => {
  window.removeEventListener("resize", () => {
    updateStickyColumnWidth();
    handleScroll();
  });
});
</script>

<style scoped>
.card-cell {
  padding: 0.475rem;
  min-width: 56px;
  min-height: 44px;
  border: 1px solid #f1f1f1;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
