this program depend on ffmpeg, so first install this service on your pc.


1. DATABASE COMMANDS I USED: 
--select 'emran' from dual where not exists (select 1 from course );
--select * from user_sequences;
--drop sequence video_seq;

--create sequence lesson_seq
--start with 1 
--increment by 1
--nocache; 

--select * from lesson;
--commit;

--select * from user_sequences;

--select column_name
--from user_cons_columns
--where constraint_name = 'SYS_C008368'
--
--;

--describe lesson;

--insert into course (course_id, name) 
--select 1, 'Javascript' from dual where not exists (
--select 1 from course where name = 'Javascript'
--);


--select length from lesson;
--select count(is_video) from lesson;

--update course 
--set hour = (select sum(length) from lesson),
--    lectures = (select count(is_video) from lesson)
--where course_id = 1;

select * from course;






