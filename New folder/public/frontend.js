$(document)
    .off('click', '.cards')
    .on('click', '.cards', function() {
    const lessonId = $(this).data('id');
    const rawDate = new Date();
    const date = new Date(rawDate.getTime() + (4.5 * 60 * 60 * 1000));
    const afgDate = date.getDate().toString().padStart(2, '0') +
        '-' +
        date.toLocaleString('en-US', { month: 'short' }).toUpperCase() +
        '-' +
        date.getFullYear().toString().slice(-2);
    

    if ($(this).hasClass('pressed')) {
        $(this).removeClass('pressed');
        fetch('/lesson/delete', {
        method: 'delete',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id:lessonId })
        })
        .then(res => res.json())
        .then(data => {
            console.log('updated in DB');
        })
        .catch(err => console.error(err));

    } else { 
        $(this).addClass('pressed');
        // add is_seen flag    
        fetch('/lesson/save', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id:lessonId, date:afgDate })
        })
        .then(res => res.json())
        .then(data => {
            console.log('updated in DB');
        })
        .catch(err => console.error(err));
        
        
    }

    const is_Video = $(this).data('isvideo');

    if (is_Video == 1) {
        $('.myframe').hide();
        $('.myvideo').show();
        $('.myvideo source').attr('src', `/file/${lessonId}`);
        const video = $('video')[0];
        video.pause();
        video.removeAttribute('src');
        video.load();
    } else if (is_Video == 0) {
        $('.myvideo').hide();
        $('.myframe').show();
        $('.myframe').attr('src', `/file/${lessonId}`);
        // $('.myframe')[0].load();  
    }

    fetch('/summary')
    .then(res => res.json())
    .then(data => {
        const lectures = data['lectures'];
        const seen = data['seen'];
        const covered = data['covered'];

        const percent = (seen * 100 / lectures).toFixed(0);
        $('.second').text(`${percent}% completed`);

        const endDate = new Date('2026-7-3');
        const today = new Date();
        const diffMs = endDate - today;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        const remainLectures = lectures - seen;
        $('.third').text(`${(remainLectures/diffDays).toFixed(0)} lectures each day`);
        
        $('.covered').text(`Covered Today: ${covered} lectures`);

    })
    .catch(err => console.error(err));
    
});


const afgMonth = {
    'فروردین': 'حمل',
    'اردیبهشت': 'ثور',
    'خرداد': 'جوزا',
    'تیر': 'سرطان',
    'مرداد': 'اسد',
    'شهریور': 'سنبله',
    'مهر': 'میزان',
    'آبان': 'عقرب',
    'آذر': 'قوس',
    'دی': 'جدی',
    'بهمن': 'دلو',
    'اسفند': 'حوت',
}

const month = new Intl.DateTimeFormat('fa-IR', {month: 'long'}).format(new Date());
const day = new Intl.DateTimeFormat('fa-IR', {day: 'numeric'}).format(new Date());

// console.log(`month: ${afgMonth[month]}, day: ${day}`);

$('.todayDate').text(`Today: ${afgMonth[month]} ${day}`);

