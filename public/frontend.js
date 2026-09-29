let currentCard = 0;

$(document).ready(function () {
  updateSummary();
});

$(document)
  .off("click", ".cards")
  .on("click", ".cards", function () {
    const cards = $(".cards");
    currentCard = cards.index(this);
    console.log("current card: ", currentCard);

    const lessonId = $(this).data("id");
    const rawDate = new Date();
    const date = new Date(rawDate.getTime());
    const afgDate =
      date.getDate().toString().padStart(2, "0") +
      "-" +
      date.toLocaleString("en-US", { month: "short" }).toUpperCase() +
      "-" +
      date.getFullYear().toString().slice(-2);
    const dateToServer =
      date.getFullYear() +
      "-" +
      String(date.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(date.getDate()).padStart(2, "0");

    if ($(this).hasClass("pressed")) {
      $(this).removeClass("pressed");
      fetch("/lesson/delete", {
        method: "delete",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: lessonId }),
      })
        .then((res) => res.json())
        .then((data) => {
          console.log("updated in DB");
        })
        .catch((err) => console.error(err));
    } else {
      $(this).addClass("pressed");
      // add is_seen flag
      fetch("/lesson/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: lessonId, date: dateToServer }),
      })
        .then((res) => res.json())
        .then((data) => {
          console.log("updated in DB");
        })
        .catch((err) => console.error(err));
    }

    updateSummary();

    const is_Video = $(this).data("isvideo");

    if (is_Video == 1) {
      $(".myframe").hide();
      $(".myvideo").show();
      $(".myvideo source").attr("src", `/file/${lessonId}`);
      $(".myvideo track").attr("src", `/subtitle/${lessonId}`);
      const video = $("video")[0];
      video.pause();
      video.removeAttribute("src");
      video.load();
    } else if (is_Video == 0) {
      $(".myvideo").hide();
      $(".myframe").show();
      $(".myframe").attr("src", `/file/${lessonId}`);
      // $('.myframe')[0].load();
    }
  });

function showSpeed(video) {
  $(".speed-display")
    .text(video.playbackRate + "x")
    .show();

  setTimeout(function () {
    $(".speed-display").hide();
  }, 1000);
}

$(document).on("keydown", function (event) {
  const video = $(".myvideo")[0];

  if (!video) return;

  // C = toggle subtitles
  if (event.key.toLowerCase() === "c") {
    const track = video.textTracks[0];

    if (!track) return;

    if (track.mode === "showing") {
      track.mode = "disabled";
    } else {
      track.mode = "showing";
    }
  }

  if (event.key === "ArrowDown") {
    video.volume = Math.max(video.volume - 0.1, 0);
  }

  if (event.key === "ArrowUp") {
    video.volume = Math.min(video.volume + 0.1, 1);
  }

  // Shift + > = increase speed
  if (event.shiftKey && event.code === "Period") {
    video.playbackRate = Math.min(video.playbackRate + 0.25, 4);

    showSpeed(video);
  }

  if (event.shiftKey && event.code === "Comma") {
    video.playbackRate = Math.max(video.playbackRate - 0.25, 0.25);

    showSpeed(video);
  }

  if (event.key === "ArrowRight") {
    const cards = $(".cards");

    if (currentCard < cards.length - 1) {
      currentCard++;

      // Trigger the normal click event
      cards.eq(currentCard).trigger("click");
    }
  }
});

const afgMonth = {
  فروردین: "حمل",
  اردیبهشت: "ثور",
  خرداد: "جوزا",
  تیر: "سرطان",
  مرداد: "اسد",
  شهریور: "سنبله",
  مهر: "میزان",
  آبان: "عقرب",
  آذر: "قوس",
  دی: "جدی",
  بهمن: "دلو",
  اسفند: "حوت",
};

const month = new Intl.DateTimeFormat("fa-IR", { month: "long" }).format(
  new Date(),
);
const day = new Intl.DateTimeFormat("fa-IR", { day: "numeric" }).format(
  new Date(),
);
$(".todayDate").html(`Today: <span class="ar">${day + afgMonth[month]}</span>`);

function updateSummary() {
  fetch("/summary")
    .then((res) => res.json())
    .then((data) => {
      const lectures = data["lectures"];
      const seen = data["seen"];
      const covered = data["covered"];

      const percent = ((seen * 100) / lectures).toFixed(0);
      $(".second").text(`${percent}% completed`);

      const endDate = new Date("2026-9-18");
      const today = new Date();
      const diffMs = endDate - today;
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      const remainLectures = lectures - seen;
      $(".third").text(
        `${(remainLectures / diffDays).toFixed(0)} lectures each day`,
      );

      $(".covered").text(`Covered Today: ${covered} lectures`);

      const endDateDari = new Intl.DateTimeFormat("fa-AF-u-ca-persian", {
        day: "numeric",
        month: "long",
      }).format(endDate);
      $(".fourth").html(`Finish date: <span class="ar">${endDateDari}</span>`);
    })
    .catch((err) => console.error(err));
}
