<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('ai:queue-process --limit=5')
    ->everyMinute()
    ->withoutOverlapping(10)
    ->runInBackground();
