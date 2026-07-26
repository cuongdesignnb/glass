<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('ai:queue-process')
    ->everyMinute()
    ->withoutOverlapping(30);
