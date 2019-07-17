package com.eknv.turbo.framework;

import org.springframework.stereotype.Service;

@Service
public class Deployment {

    private boolean released = true;
    private boolean production = false;
    private Long currentDBVersion;
    private boolean runTestsOnReload = false;
    private boolean buildOnReload = false;
    private boolean justStarted = true;

    public static Boolean RELOAD_ENTITIES = false;

    public boolean isProduction() {
        //return true;
        return production;
    }

    public void setProduction(boolean production) {
        this.production = production;
    }

    public boolean isReleased() {
        return released;
    }

    public void release() {
        this.released = true;
    }

    public void goToMaintenanceMode() {
        this.released = false;
    }

    public Long getCurrentDBVersion() {
        if (currentDBVersion == null) {
            throw new RuntimeException("Current patch version has not been specified yet");
        }
        return currentDBVersion;
    }

    public void setCurrentDBVersion(Long currentDBVersion) {
        this.currentDBVersion = currentDBVersion;
    }

    public void increaseDBVersion() {
        if (currentDBVersion == null) {
            throw new RuntimeException("Current patch version has not been specified yet");
        }
        this.currentDBVersion = currentDBVersion + 1;
    }

    public void setReleased(boolean released) {
        this.released = released;
    }

    public boolean runTestsOnReload() {
        return runTestsOnReload;
    }

    public void setRunTestsOnReload(boolean runTests) {
        this.runTestsOnReload = runTests;
    }

    public boolean buildOnReload() {
        return buildOnReload;
    }

    public void setBuildOnReload(boolean buildOnReload) {
        this.buildOnReload = buildOnReload;
    }

    public boolean isJustStarted() {
        return justStarted;
    }

    public void setJustStarted(boolean justStarted) {
        this.justStarted = justStarted;
    }
}
