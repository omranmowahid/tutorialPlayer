$(document)
    .off('click', '.cards')
    .on('click', '.cards', function() {
    const lessonId = $(this).data('id');

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
        body: JSON.stringify({ id:lessonId })
        })
        .then(res => res.json())
        .then(data => {
            console.log('updated in DB');
        })
        .catch(err => console.error(err));
        
        
    }

    const is_Video = $(this).data('isvideo');

    if (is_Video == 1) {
        console.log('frontend video ' + lessonId)
        $('.myframe').hide();
        $('.myvideo').show();
        $('.myvideo source').attr('src', `/file/${lessonId}`);
        const video = $('video')[0];
        video.pause();
        video.removeAttribute('src');
        video.load();
    } else if (is_Video == 0) {
        console.log('frontend file' + lessonId)
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
        const percent = (seen * 100 / lectures).toFixed(0);
        $('.second').text(`${percent}% completed`);

        const endDate = new Date('2026-7-3');
        const today = new Date();

        const diffMs = endDate - today;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        const remainLectures = lectures - seen;

        $('.third').text(`${(remainLectures/diffDays).toFixed(0)} lectures each day`);


    })
    .catch(err => console.error(err));
    
});